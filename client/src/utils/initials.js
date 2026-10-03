// One implementation of "the letters to show when there is no photo".
// This was previously copy-pasted into five files with three different
// behaviours (one used a single initial, one used two), so the same person
// got a different badge depending on which page you were on.

export const initials = (name = '', count = 2) => {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return '?';

  if (words.length === 1) {
    return words[0].slice(0, count).toUpperCase();
  }

  // First letter of the first and last word: "Jean Claude Uwase" -> "JU",
  // which reads better than "JC" for the long Rwandan names in the roster.
  const first = words[0][0];
  const last = words[words.length - 1][0];
  return (first + last).toUpperCase();
};
