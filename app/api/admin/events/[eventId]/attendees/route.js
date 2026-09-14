import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normaliseHandle(handle) {
  return handle?.trim().replace(/^@/, '').toLowerCase() || '';
}

function buildPlaceholderEmail(handle) {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return `placeholder+${handle}-${suffix}@placeholder.manchestergents.com`;
}

function splitName(rawName = '', fallbackHandle = '') {
  const trimmed = rawName.trim();
  if (!trimmed) {
    const fallback = fallbackHandle.replace(/[@_.-]+/g, ' ').trim();
    const fallbackFirst = fallback.split(/\s+/).filter(Boolean)[0] || fallbackHandle || 'Guest';
    return {
      firstName: fallbackFirst,
      preferredName: null
    };
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstName = parts[0];
  const preferred = trimmed !== firstName ? trimmed : null;
  return { firstName, preferredName: preferred };
}

function parseBooleanCell(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalised = String(value)
    .trim()
    .toLowerCase();
  if (!normalised || normalised === 'null') {
    return null;
  }
  if (['yes', 'y', 'true', '1'].includes(normalised)) {
    return true;
  }
  if (['no', 'n', 'false', '0'].includes(normalised)) {
    return false;
  }
  return null;
}

function splitRow(line) {
  if (line.includes('\t')) {
    return line.split('\t').map((cell) => cell.trim());
  }
  if (line.includes('|')) {
    return line.split('|').map((cell) => cell.trim());
  }
  if (line.includes(',')) {
    return line.split(',').map((cell) => cell.trim());
  }
  return line
    .split(/\s{2,}/)
    .map((cell) => cell.trim());
}

function parsePlaceholderTable(rawTable = '') {
  const entries = [];
  if (!rawTable) {
    return entries;
  }

  const lines = rawTable.split(/\r?\n/);
  for (const rawLine of lines) {
    if (!rawLine) {
      continue;
    }
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }
    const cells = splitRow(rawLine);
    if (!cells.length || cells.every((cell) => !cell)) {
      continue;
    }

    const [nameCell = '', handleCell = '', generalCell, groupCell, otherCell, taggingCell] = cells;
    const headerProbe = `${nameCell} ${handleCell}`.trim().toLowerCase();
    if (headerProbe.includes('name') && headerProbe.includes('instagram')) {
      continue;
    }

    const handle = normaliseHandle(handleCell || '');
    if (!handle) {
      entries.push({
        name: nameCell || '',
        handle: '',
        generalPhoto: parseBooleanCell(generalCell),
        groupPhoto: parseBooleanCell(groupCell),
        otherFace: parseBooleanCell(otherCell),
        tagging: parseBooleanCell(taggingCell)
      });
      continue;
    }

    entries.push({
      name: nameCell || '',
      handle,
      generalPhoto: parseBooleanCell(generalCell),
      groupPhoto: parseBooleanCell(groupCell),
      otherFace: parseBooleanCell(otherCell),
      tagging: parseBooleanCell(taggingCell)
    });
  }

  return entries;
}

const USER_SUMMARY_SELECT = {
  id: true,
  instagramHandle: true,
  firstName: true,
  preferredName: true,
  shareFirstName: true,
  isPlaceholder: true,
  generalPhotoConsent: true,
  groupFaceConsent: true,
  otherFaceConsent: true,
  taggingConsent: true,
  name: true,
  fullName: true
};

function dedupeUsers(users = []) {
  const map = new Map();
  for (const user of users) {
    if (user && user.id) {
      map.set(user.id, user);
    }
  }
  return Array.from(map.values());
}

async function createPlaceholderFromEntry(entry) {
  const handle = entry.handle;
  const email = buildPlaceholderEmail(handle);
  const passwordHash = await hashPassword(randomUUID());
  const { firstName, preferredName } = splitName(entry.name || '', handle);
  const displayName = preferredName || firstName;

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      instagramHandle: handle,
      firstName,
      preferredName,
      name: displayName,
      fullName: displayName,
      shareFirstName: true,
      isPlaceholder: true,
      generalPhotoConsent: entry.generalPhoto,
      groupFaceConsent: entry.groupPhoto,
      otherFaceConsent: entry.otherFace,
      taggingConsent: entry.tagging
    },
    select: USER_SUMMARY_SELECT
  });
}

function buildPlaceholderUpdate(entry, currentUser) {
  const update = {};
  if (entry.name) {
    const { firstName, preferredName } = splitName(entry.name, entry.handle);
    if (firstName && firstName !== currentUser.firstName) {
      update.firstName = firstName;
    }
    if ((preferredName || null) !== (currentUser.preferredName || null)) {
      update.preferredName = preferredName;
    }
    const displayName = preferredName || firstName;
    if (displayName && displayName !== currentUser.name) {
      update.name = displayName;
      update.fullName = displayName;
    }
  }
  if (entry.generalPhoto !== null) {
    if (entry.generalPhoto !== currentUser.generalPhotoConsent) {
      update.generalPhotoConsent = entry.generalPhoto;
    }
  } else if (currentUser.generalPhotoConsent !== null) {
    update.generalPhotoConsent = null;
  }
  if (entry.groupPhoto !== null) {
    if (entry.groupPhoto !== currentUser.groupFaceConsent) {
      update.groupFaceConsent = entry.groupPhoto;
    }
  } else if (currentUser.groupFaceConsent !== null) {
    update.groupFaceConsent = null;
  }
  if (entry.otherFace !== null) {
    if (entry.otherFace !== currentUser.otherFaceConsent) {
      update.otherFaceConsent = entry.otherFace;
    }
  } else if (currentUser.otherFaceConsent !== null) {
    update.otherFaceConsent = null;
  }
  if (entry.tagging !== null) {
    if (entry.tagging !== currentUser.taggingConsent) {
      update.taggingConsent = entry.tagging;
    }
  } else if (currentUser.taggingConsent !== null) {
    update.taggingConsent = null;
  }
  return update;
}

async function handlePlaceholderTable(event, rawTable) {
  const rows = parsePlaceholderTable(rawTable);
  if (!rows.length) {
    return Response.json({ error: 'No valid rows found in the pasted table.' }, { status: 400 });
  }

  const handles = Array.from(new Set(rows.map((row) => row.handle).filter(Boolean)));
  if (!handles.length) {
    return Response.json({ error: 'No Instagram handles detected in the pasted table.' }, { status: 400 });
  }

  const existingUsers = await prisma.user.findMany({
    where: { instagramHandle: { in: handles } },
    select: USER_SUMMARY_SELECT
  });
  const usersByHandle = new Map(existingUsers.map((user) => [user.instagramHandle, user]));

  const createdPlaceholders = [];
  const updatedPlaceholders = [];
  const matchedMembers = [];
  const matchedPlaceholders = [];
  const skipped = [];

  for (const row of rows) {
    if (!row.handle) {
      skipped.push({ name: row.name, reason: 'Missing Instagram handle.' });
      continue;
    }

    let user = usersByHandle.get(row.handle);
    if (!user) {
      try {
        user = await createPlaceholderFromEntry(row);
        usersByHandle.set(row.handle, user);
        createdPlaceholders.push(user);
      } catch (error) {
        console.error('Create placeholder from table failed:', row.handle, error);
        skipped.push({ handle: row.handle, reason: 'Failed to create placeholder.' });
        continue;
      }
    } else if (user.isPlaceholder) {
      const update = buildPlaceholderUpdate(row, user);
      if (Object.keys(update).length) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: update,
          select: USER_SUMMARY_SELECT
        });
        usersByHandle.set(row.handle, user);
        updatedPlaceholders.push(user);
      } else {
        matchedPlaceholders.push(user);
      }
    } else {
      matchedMembers.push(user);
    }
  }

  const targetUsers = dedupeUsers(
    rows
      .map((row) => (row.handle ? usersByHandle.get(row.handle) : null))
      .filter(Boolean)
  );
  const uniqueUserIds = targetUsers.map((user) => user.id);

  if (!uniqueUserIds.length) {
    return Response.json({
      event,
      stats: {
        createdPlaceholders,
        updatedPlaceholders,
        matchedMembers,
        matchedPlaceholders,
        added: [],
        already: [],
        skipped
      }
    });
  }

  const existingSignups = await prisma.eventSignup.findMany({
    where: {
      eventId: event.id,
      userId: { in: uniqueUserIds }
    },
    select: { userId: true }
  });
  const alreadySigned = new Set(existingSignups.map((signup) => signup.userId));

  const signupTargets = uniqueUserIds.filter((userId) => !alreadySigned.has(userId));
  if (signupTargets.length) {
    await prisma.eventSignup.createMany({
      data: signupTargets.map((userId) => ({ eventId: event.id, userId })),
      skipDuplicates: true
    });
  }

  const added = targetUsers.filter((user) => !alreadySigned.has(user.id));
  const already = targetUsers.filter((user) => alreadySigned.has(user.id));

  return Response.json({
    event,
    stats: {
      createdPlaceholders: dedupeUsers(createdPlaceholders),
      updatedPlaceholders: dedupeUsers(updatedPlaceholders),
      matchedMembers: dedupeUsers(matchedMembers),
      matchedPlaceholders: dedupeUsers(matchedPlaceholders),
      added: dedupeUsers(added),
      already: dedupeUsers(already),
      skipped
    }
  }, { status: added.length ? 201 : 200 });
}

export async function POST(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  try {
    const body = await request.json();
    const placeholderTable = typeof body?.placeholderTable === 'string' ? body.placeholderTable : '';
    const rawIds = Array.isArray(body?.userIds) ? body.userIds : [];
    const normalisedIds = rawIds.map((value) => String(value)).filter(Boolean);
    const handle = normaliseHandle(body?.instagramHandle || '');

    if (!normalisedIds.length && !handle && !placeholderTable.trim()) {
      return Response.json({ error: 'Select at least one member to add.' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      select: { id: true, title: true }
    });
    if (!event) {
      return Response.json({ error: 'Event not found.' }, { status: 404 });
    }

    if (placeholderTable.trim()) {
      return handlePlaceholderTable(event, placeholderTable);
    }

    let users = [];
    if (normalisedIds.length) {
      users = await prisma.user.findMany({
        where: { id: { in: normalisedIds } },
        select: { id: true, instagramHandle: true }
      });
      if (users.length !== normalisedIds.length) {
        return Response.json({ error: 'One or more selected members no longer exist.' }, { status: 404 });
      }
    } else if (handle) {
      const user = await prisma.user.findUnique({
        where: { instagramHandle: handle },
        select: { id: true, instagramHandle: true }
      });
      if (!user) {
        return Response.json({ error: `No member or placeholder found for @${handle}.` }, { status: 404 });
      }
      users = [user];
    }

    const userIds = users.map((user) => user.id);
    const existing = await prisma.eventSignup.findMany({
      where: {
        eventId: event.id,
        userId: { in: userIds }
      },
      select: { userId: true }
    });
    const existingIds = new Set(existing.map((signup) => signup.userId));

    const toCreate = users.filter((user) => !existingIds.has(user.id));
    if (toCreate.length) {
      await prisma.eventSignup.createMany({
        data: toCreate.map((user) => ({ eventId: event.id, userId: user.id })),
        skipDuplicates: true
      });
    }

    const skipped = users.filter((user) => existingIds.has(user.id));

    return Response.json(
      {
        event,
        created: toCreate,
        skipped
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin add attendee error:', error);
    return Response.json({ error: 'Unable to add attendee to event.' }, { status: 500 });
  }
}
