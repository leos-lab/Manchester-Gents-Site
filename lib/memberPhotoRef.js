// Member photos stored in Pinstripe are saved on the User row as
// "pinstripe:<photoId>". Safe to import in client components.
const PREFIX = 'pinstripe:';

export function isPinstripeRef(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function pinstripeRefId(value) {
  return isPinstripeRef(value) ? value.slice(PREFIX.length) : null;
}

export function toPinstripeRef(photoId) {
  return `${PREFIX}${photoId}`;
}

// Where the website should load a member photo from. Pinstripe photos go
// through /api/member-photos (checks the viewer is the member or an admin);
// anything else is a legacy URL from before the move.
// size: "thumb" (200px), "medium" (800px), "display" (1600px) or "original".
export function photoSrc(value, size = 'display') {
  if (!value) return null;
  const id = pinstripeRefId(value);
  if (!id) return value;
  const query = size && size !== 'display' ? `?v=${encodeURIComponent(size)}` : '';
  return `/api/member-photos/${encodeURIComponent(id)}${query}`;
}
