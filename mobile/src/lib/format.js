const tz = undefined; // device time zone

export function eventDay(iso) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: tz }),
    day: d.toLocaleDateString('en-GB', { day: 'numeric', timeZone: tz }),
    month: d.toLocaleDateString('en-GB', { month: 'short', timeZone: tz })
  };
}

export function eventWhen(startIso, endIso) {
  const start = new Date(startIso);
  const date = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = start.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  const end = endIso ? new Date(endIso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }) : null;
  return { date, time: end ? `${time} – ${end}` : time };
}

export function messageTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const days = (now - d) / 86400000;
  if (days < 6) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function dayDivider(iso) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function memberSince(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'MG';
}
