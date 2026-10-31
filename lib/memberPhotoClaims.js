// Checks photo references a client sends before they're saved on a User, so
// nobody can attach (and so gain access to) another member's private photo.
import { isPinstripeRef, pinstripeRefId } from './memberPhotoRef';
import { getMemberPhoto, reassignMemberPhoto, deleteMemberPhoto } from './pinstripeMedia';

export class PhotoRefError extends Error {
  constructor(message = 'That photo upload is not valid. Please upload it again.') {
    super(message);
    this.status = 400;
  }
}

async function ownerOf(ref) {
  try {
    return (await getMemberPhoto(pinstripeRefId(ref))).memberRef;
  } catch (error) {
    if (error.status === 404) throw new PhotoRefError();
    throw error;
  }
}

// Registration: only fresh sign-up uploads (still parked under "registration").
export async function assertRegistrationPhotos(refs) {
  for (const ref of refs.filter(Boolean)) {
    if (!isPinstripeRef(ref)) throw new PhotoRefError();
    if ((await ownerOf(ref)) !== 'registration') throw new PhotoRefError();
  }
}

export async function claimRegistrationPhotos(refs, userId) {
  for (const ref of refs.filter(isPinstripeRef)) {
    await reassignMemberPhoto(pinstripeRefId(ref), userId);
  }
}

// Profile edit: a value may stay as it is, or be one of the member's own uploads.
export async function assertProfilePhotos(nextRefs, currentValues, userId) {
  for (const ref of nextRefs.filter(Boolean)) {
    if (currentValues.includes(ref)) continue;
    if (!isPinstripeRef(ref)) throw new PhotoRefError();
    if ((await ownerOf(ref)) !== userId) throw new PhotoRefError();
  }
}

// Best effort: remove photos a member replaced or removed.
export async function deleteReplacedPhotos(previousValues, nextValues) {
  const stale = previousValues.filter((v) => isPinstripeRef(v) && !nextValues.includes(v));
  await Promise.all(
    stale.map((ref) => deleteMemberPhoto(pinstripeRefId(ref)).catch((e) => console.warn('Photo cleanup failed', e.message)))
  );
}
