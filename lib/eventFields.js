// Event fields the app shows on cards and detail screens.
export const EVENT_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  location: true,
  startTime: true,
  endTime: true,
  signupDeadline: true,
  capacity: true,
  coverImageUrl: true,
  coverFocus: true,
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
  backgroundColor: true,
  textColor: true
};

// CSS object-position for an event cover cropped around its focus point.
export function coverPosition(event) {
  const f = event?.coverFocus;
  return f && typeof f.x === 'number' && typeof f.y === 'number' ? `${f.x}% ${f.y}%` : undefined;
}
