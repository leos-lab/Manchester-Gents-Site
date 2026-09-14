export function getDisplayName(user) {
  if (!user) {
    return '';
  }
  const preferred = user.preferredName?.trim();
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (user.shareFirstName === false) {
    return preferred || first || user.instagramHandle || '';
  }
  if (preferred) {
    return preferred;
  }
  if (first && last) {
    return `${first} ${last}`.trim();
  }
  if (first) {
    return first;
  }
  return user.name?.trim() || user.instagramHandle || '';
}
