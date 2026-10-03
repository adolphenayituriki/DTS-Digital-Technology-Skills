// Mirror of server/src/utils/options.js. The server is the source of truth and
// validates against the same lists; keeping a copy here means the dropdowns and
// the API agree without a round trip on every keystroke.

// The kinds of assessment a trainer can record, each numbered in sequence
// (Quiz 1, Quiz 2, ...). Mirrors server/src/utils/options.js.
export const ASSESSMENT_TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'cat', label: 'CAT' },
  { value: 'exam', label: 'Exam' },
  { value: 'other', label: 'Other' },
];

export const assessmentTypeLabel = (value) =>
  ASSESSMENT_TYPES.find((item) => item.value === String(value || '').trim().toLowerCase())?.label || 'Assessment';

// Marks saved before assessment types existed have none, and are shown as an
// unnamed assessment rather than hidden.
export const DEFAULT_ASSESSMENT_NO = 1;

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
  'Physical Class: UR-Huye Campus',
  'Online Class: Zoom',
  'Online Class: Google Meet',
];

export const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];

// Mirror of the server pattern: a numeric UR run of 8-12 digits, e.g. 225020019.
// (The DTS-YYYY-NNNN number is generated separately after acceptance.)
export const REG_NUMBER_PATTERN = /^\d{8,12}$/;
