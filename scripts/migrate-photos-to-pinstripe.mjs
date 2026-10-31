#!/usr/bin/env node
// One-off: copy members' private reference photos from Cloudinary into
// Pinstripe (home server disk only) and point the User rows at them.
//
//   node scripts/migrate-photos-to-pinstripe.mjs --dry-run
//   node scripts/migrate-photos-to-pinstripe.mjs
//
// Needs DATABASE_URL, PINSTRIPE_API_URL (or NEXT_PUBLIC_PINSTRIPE_API_URL) and
// PINSTRIPE_MANAGEMENT_TOKEN. Safe to re-run: rows already on Pinstripe are skipped.
// Cloudinary files are left in place; delete them once you've checked the site.
import { PrismaClient } from '@prisma/client';

const DRY_RUN = process.argv.includes('--dry-run');
const API = (process.env.PINSTRIPE_API_URL || process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.PINSTRIPE_MANAGEMENT_TOKEN || process.env.API_TOKEN;
const SITE = process.env.NEXT_PUBLIC_PINSTRIPE_SITE_SLUG || 'manchestergents';
const FIELDS = ['profilePhotoUrl', 'profilePhotoOriginalUrl'];

if (!API || !TOKEN) {
  console.error('Set PINSTRIPE_API_URL and PINSTRIPE_MANAGEMENT_TOKEN first.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function copyToPinstripe(userId, url) {
  const download = await fetch(url);
  if (!download.ok) throw new Error(`download failed (${download.status})`);
  const mimeType = download.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const name = new URL(url).pathname.split('/').pop() || 'photo.jpg';
  const form = new FormData();
  form.append('kind', 'private');
  form.append('file', new Blob([await download.arrayBuffer()], { type: mimeType }), name);
  const res = await fetch(`${API}/api/sites/${SITE}/members/${encodeURIComponent(userId)}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || `upload failed (${res.status})`);
  return `pinstripe:${json.data.id}`;
}

const users = await prisma.user.findMany({
  where: { OR: FIELDS.map((f) => ({ [f]: { startsWith: 'http' } })) },
  select: { id: true, instagramHandle: true, profilePhotoUrl: true, profilePhotoOriginalUrl: true }
});
console.log(`${users.length} member(s) with photos still on Cloudinary${DRY_RUN ? ' (dry run)' : ''}`);

let moved = 0;
let failed = 0;
for (const user of users) {
  const update = {};
  const copied = new Map(); // same URL in both fields -> upload once
  for (const field of FIELDS) {
    const url = user[field];
    if (!url?.startsWith('http')) continue;
    if (DRY_RUN) {
      console.log(`  would move @${user.instagramHandle} ${field}`);
      continue;
    }
    try {
      if (!copied.has(url)) copied.set(url, await copyToPinstripe(user.id, url));
      update[field] = copied.get(url);
    } catch (error) {
      failed += 1;
      console.error(`  @${user.instagramHandle} ${field}: ${error.message}`);
    }
  }
  if (Object.keys(update).length) {
    await prisma.user.update({ where: { id: user.id }, data: update });
    moved += 1;
    console.log(`  moved @${user.instagramHandle}`);
  }
}
console.log(DRY_RUN ? 'Dry run complete.' : `Done: ${moved} member(s) moved, ${failed} photo(s) failed.`);
await prisma.$disconnect();
