// expo-image contentPosition for an event cover cropped around its focus
// point ({ x, y } percentages, set when the cover is chosen).
export function coverPosition(event) {
  const f = event?.coverFocus;
  return f && typeof f.x === 'number' && typeof f.y === 'number' ? { left: `${f.x}%`, top: `${f.y}%` } : 'center';
}
