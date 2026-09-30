// Mirror of server/src/utils/options.js. The server is the source of truth and
// validates against the same lists; keeping a copy here means the dropdowns and
// the API agree without a round trip on every keystroke.
export const LEVELS_OF_STUDY = [
  'Level I',
  'Level II',
  'Level III',
  'Level IV',
  'Level V',
  'Level VI',
  'Graduate',
  'Other',
];

export const DEPARTMENTS = [
  'Computer Science',
  'Business & Management',
  'Economics',
  'Education',
  'Engineering',
  'Health Sciences',
  'Arts & Humanities',
  'Other',
];

// Where the applicant wants to study: on campus at UR-Huye, or online over
// Zoom / Google Meet. Mirrors server/src/utils/options.js.
export const LEARNING_PLACES = [
  'Physical — UR-Huye Campus',
  'Online — Zoom',
  'Online — Google Meet',
];

export const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];

// Mirror of the server pattern: a numeric UR run of 8-12 digits, e.g. 225020019.
// (The DTS-YYYY-NNNN number is generated separately after acceptance.)
export const REG_NUMBER_PATTERN = /^\d{8,12}$/;
