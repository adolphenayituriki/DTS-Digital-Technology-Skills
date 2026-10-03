// Option lists for the application form. Kept here so the API can reject a
// value the dropdown could never have produced, instead of storing whatever a
// crafted request sends. The client mirrors this file in client/src/utils/.

// Current academic standing. Not a free-text field: the reports DTS produces
// only ever group by these values.
export const LEVELS_OF_STUDY = [
  "Level I",
  "Level II",
  "Level III",
  "Level IV",
  "Level V",
  "Level VI",
  "Graduate",
  "Other",
];

export const DEPARTMENTS = [
  "Computer Science",
  "Business & Management",
  "Economics",
  "Education",
  "Engineering",
  "Health Sciences",
  "Arts & Humanities",
  "Other",
];

// How the applicant wants to study. Physical training runs at UR-Huye Campus
// on a fixed timetable; online training is delivered over Zoom or Google Meet.
// This is a property of the applicant, not of the intake, so it is asked on
// the application rather than derived from which courses they picked.
export const LEARNING_PLACES = [
  "Physical Class: UR-Huye Campus",
  "Online Class: Zoom",
  "Online Class: Google Meet",
];

// "Prefer not to say" is a real answer, not a null - it is stored explicitly so
// the applicant was actually offered the choice.
export const GENDERS = [
  "Female",
  "Male",
  "Other",
  "Prefer not to say",
];

// The kinds of assessment a trainer can record, each numbered in sequence
// (Quiz 1, Quiz 2, ...). Stored as a slug plus a separate number rather than as
// one free-text string, so a course can be summarised per type ("average of
// three quizzes") and the mark grid can build its own columns. `weight` is a
// default only: the trainer overrides it per assessment when a course does not
// weight every kind equally.
export const ASSESSMENT_TYPES = [
  { value: "quiz", label: "Quiz" },
  { value: "exercise", label: "Exercise" },
  { value: "assignment", label: "Assignment" },
  { value: "cat", label: "CAT" },
  { value: "exam", label: "Exam" },
  { value: "other", label: "Other" },
];

export const assessmentTypeProblem = (value) => {
  const slug = String(value ?? "").trim().toLowerCase();
  if (!slug) return "Choose an assessment type";
  if (!ASSESSMENT_TYPES.some((item) => item.value === slug)) return "That assessment type is not recognised";
  return "";
};

export const assessmentTypeLabel = (value) =>
  ASSESSMENT_TYPES.find((item) => item.value === String(value || "").trim().toLowerCase())?.label || "Assessment";

// The number is the 1 in "Quiz 1". Bounded so a pasted value cannot become an
// unbounded column count in the marks grid.
export const assessmentNoProblem = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 50) return "Number must be between 1 and 50";
  return "";
};

// Marks predating this change have no assessment type. They are treated as a
// single unnamed assessment per course rather than being hidden, so existing
// records keep showing in the grid and on the student's results table.
export const DEFAULT_ASSESSMENT_TYPE = "";
export const DEFAULT_ASSESSMENT_NO = 1;

// University Registration (UR) numbers are numeric, e.g. 225020019.
// They are distinct from the DTS-issued Registration Number (DTS-YYYY-NNNN)
// that the system generates and emails to accepted students. Applicants retype
// their UR number from an old receipt, so whitespace is stripped and a run of
// 8-12 digits is accepted. The upper bound avoids a runaway paste of a
// serialised object or receipt that happens to begin with digits.
export const REG_NUMBER_PATTERN = /^\d{8,12}$/;

export const pickOption = (list, value) => {
  const found = list.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase());
  return found || "";
};

// Empty string means "not answered" and is always allowed; a non-empty value
// that is not on the list is rejected.
export const optionProblem = (list, value, label) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (!pickOption(list, trimmed)) return `${label} is not a valid option`;
  return "";
};
