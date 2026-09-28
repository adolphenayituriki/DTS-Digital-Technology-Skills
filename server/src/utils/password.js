import crypto from "crypto";

// Minimum length for any password a human sets from here on. The User schema
// deliberately keeps its own minlength at 6 so accounts created before this
// rule existed still validate on save - raising it there would lock those
// people out of every other profile edit.
export const PASSWORD_MIN_LENGTH = 8;

// Ambiguous glyphs (0/O, 1/l/I) are excluded so a temporary password can be
// re-typed from an email or read off a printed handover sheet without a phone
// call. crypto.randomInt is rejection-sampled, so there is no modulo bias.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*?";
const ALPHABET = UPPER + LOWER + DIGITS + SYMBOLS;

const pick = (source) => source[crypto.randomInt(0, source.length)];

// Builds a cryptographically random password that always contains at least one
// uppercase letter, one lowercase letter, one digit and one symbol, then
// shuffles so the guaranteed characters are not in a predictable position.
// Used for the credentials an admin emails to a brand new account.
export function generateTemporaryPassword(length = 12) {
  const size = Math.max(length, PASSWORD_MIN_LENGTH, 12);
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) chars.push(pick(ALPHABET));

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// Single source of truth for password validation so the routes and the error
// messages a user sees can never disagree. Returns "" when the value passes.
export function passwordProblem(value) {
  const password = String(value ?? "");
  if (!password) return "Password is required";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Password must contain both uppercase and lowercase letters";
  }
  if (!/\d/.test(password)) return "Password must contain at least one number";
  return "";
}
