// Groups a newest-first list under relative day headings, by calendar day
// (midnight to midnight, not rolling 24 hours): Today, Yesterday, a weekday
// name for the rest of the past week, "Over a week ago" up to a month, then
// month names (with the year when it isn't this year).
// Shared by the website (lib/dayGroups.js) and the app: keep the
// two copies identical apart from this note.
const DAY_MS = 86400000;

// Midnight UTC of the date's calendar day in `timeZone` (undefined = local).
function dayStart(date, timeZone) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  return Date.parse(`${ymd}T00:00:00Z`);
}

export function dayLabel(value, { now = new Date(), timeZone } = {}) {
  const date = new Date(value);
  const days = Math.round((dayStart(now, timeZone) - dayStart(date, timeZone)) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long' }).format(date);
  if (days < 30) return 'Over a week ago';
  const year = (d) => new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric' }).format(d);
  return new Intl.DateTimeFormat('en-GB', { timeZone, month: 'long', ...(year(date) === year(now) ? {} : { year: 'numeric' }) }).format(date);
}

// [{ title, data }] in the list's order, for section lists.
export function groupByDay(items, getDate, options) {
  const sections = [];
  for (const item of items) {
    const title = dayLabel(getDate(item), options);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}
