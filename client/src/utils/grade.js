// Grading scale. Keep in sync with server/src/utils/grade.js.
//
//   80-100 -> A
//   70-79  -> B
//   60-69  -> C
//   55-59  -> D
//   50-54  -> E
//   <50    -> F
export const gradeForScore = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 80) return 'A';
  if (n >= 70) return 'B';
  if (n >= 60) return 'C';
  if (n >= 55) return 'D';
  if (n >= 50) return 'E';
  return 'F';
};
