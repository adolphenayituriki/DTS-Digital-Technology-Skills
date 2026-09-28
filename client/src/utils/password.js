// Mirrors server/src/utils/password.js so the rules a user is shown before they
// submit are exactly the rules the API enforces. Keep the two in step.
export const PASSWORD_MIN_LENGTH = 8;

export function passwordProblem(value) {
  const password = String(value ?? '');
  if (!password) return 'Password is required';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Password must contain both uppercase and lowercase letters';
  }
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  return '';
}

const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

// Advisory only — nothing here blocks submission, it just tells people which
// of the optional rules they are leaving on the table.
export function passwordStrength(value) {
  const password = String(value ?? '');
  if (!password) return { score: 0, label: LABELS[0], percent: 0, color: '#dc2626' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (new Set(password).size >= 8) score += 1;

  const index = Math.min(4, Math.max(0, score - 1));
  const colors = ['#dc2626', '#f97316', '#eab308', '#65a30d', '#16a34a'];
  return {
    score: index,
    label: LABELS[index],
    percent: [12, 32, 55, 78, 100][index],
    color: colors[index],
  };
}

// The three optional rules shown as a live checklist under the field, so people
// are not told "too weak" without being told what to add.
export const PASSWORD_RULES = [
  { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (v) => v.length >= PASSWORD_MIN_LENGTH },
  { id: 'case', label: 'Upper and lowercase letters', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: 'number', label: 'At least one number', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'A symbol such as ! @ # $ (optional)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];
