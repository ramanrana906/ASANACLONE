// A small rotation of hues used to color-code people and projects
// throughout the app — deterministic per id/name, not decorative.
export const IDENTITY_COLORS = [
  "#4c9aff", // blue
  "#36b37e", // green
  "#8777d9", // purple
  "#ffab00", // amber
  "#ff6b9d", // pink
  "#00b8ab", // teal
  "#fa5a46", // coral (brand)
  "#6554c0", // indigo
];

export function colorForKey(key: string | number): string {
  const str = String(key);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return IDENTITY_COLORS[Math.abs(hash) % IDENTITY_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
