import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, X, Award } from 'lucide-react';
import apiFetch from '../api';

// The courses a student is expected to finish.
//
// preferredCourses is what they applied for and is copied verbatim from the
// application, so it is the programme the certificate should speak about. The
// fallbacks matter because it can be empty: an applicant is not forced to pick
// courses, and a student created before the field existed has none.
export function coursesFor(student, intake) {
  const preferred = (student?.preferredCourses || []).map((c) => String(c).trim()).filter(Boolean);
  if (preferred.length) return preferred;
  const program = String(student?.program || '').split(',').map((c) => c.trim()).filter(Boolean);
  if (program.length) return program;
  return (intake?.courses || []).map((c) => String(c).trim()).filter(Boolean);
}

// Lets a trainer sign off each course a student has finished.
//
// Ticking a course is what unlocks the student's Course Appreciation card once
// every course is done, so the dialog leads with that progress rather than
// burying it - the trainer can see the effect of the tick before making it.
//
// Each toggle saves immediately rather than behind a Save button. A sign-off is
// a small, reversible act, and saving per tick means a trainer marking three
// courses cannot lose the first two by closing the dialog.
export default function CourseCompletionDialog({ open, student, intake, onClose, onSaved }) {
  const [busyCourse, setBusyCourse] = useState('');
  const [done, setDone] = useState({});

  // Re-seed the checklist whenever a different student is opened. Keyed on the
  // student id rather than only on `open`, so reopening the same student after a
  // save elsewhere still shows what is stored.
  useEffect(() => {
    if (!open || !student) return;
    const next = {};
    for (const entry of student.completedCourses || []) {
      next[String(entry.course || '').trim().toLowerCase()] = entry;
    }
    setDone(next);
  }, [open, student]);

  const courses = useMemo(() => coursesFor(student, intake), [student, intake]);
  const completedCount = courses.filter(
    (course) => done[course.trim().toLowerCase()]
  ).length;
  const allDone = courses.length > 0 && completedCount === courses.length;

  if (!open || !student) return null;

  const toggle = async (course) => {
    const key = course.trim().toLowerCase();
    const next = !done[key];
    setBusyCourse(key);
    // Optimistic, so the checkbox responds immediately rather than after a round
    // trip. Rolled back if the save fails.
    setDone((current) => {
      const updated = { ...current };
      if (next) {
        updated[key] = { course };
      } else {
        delete updated[key];
      }
      return updated;
    });
    try {
      const updated = await apiFetch(`/trainer/students/${student._id}/courses`, {
        method: 'PUT',
        body: JSON.stringify({ course, completed: next }),
      });
      onSaved?.(updated);
    } catch (error) {
      setDone((current) => {
        const rolled = { ...current };
        if (next) delete rolled[key];
        else rolled[key] = { course };
        return rolled;
      });
      onSaved?.(null, error);
    } finally {
      setBusyCourse('');
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-card dialog-card-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-completion-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="dialog-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="dialog-icon">
          <Award size={24} />
        </div>
        <h3 id="course-completion-title">Course Completion</h3>
        <p className="dialog-sub">
          {student.name} · {student.regNumber || student.intakeTitle}
        </p>

        <div className={`completion-meter${allDone ? ' is-done' : ''}`}>
          <b>
            {completedCount} of {courses.length} course{courses.length === 1 ? '' : 's'} done
          </b>
          <small>
            {allDone
              ? 'Their Course Appreciation card is unlocked.'
              : 'Their card unlocks once every course is ticked.'}
          </small>
        </div>

        {courses.length === 0 ? (
          <p className="muted">
            This student has no courses on their record, so there is nothing to sign off. Add
            courses to their application, or set a programme, and they will appear here.
          </p>
        ) : (
          <ul className="completion-list">
            {courses.map((course) => {
              const key = course.trim().toLowerCase();
              const entry = done[key];
              const busy = busyCourse === key;
              return (
                <li key={course} className={entry ? 'is-done' : ''}>
                  <button
                    type="button"
                    className="completion-toggle"
                    onClick={() => toggle(course)}
                    disabled={busy}
                    aria-pressed={Boolean(entry)}
                  >
                    {entry ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    <span className="completion-course">{course}</span>
                  </button>
                  {entry && (
                    <small className="completion-by">
                      {entry.recordedBy || 'Staff'}
                      {entry.completedAt
                        ? ` · ${new Date(entry.completedAt).toLocaleDateString()}`
                        : ''}
                    </small>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="dialog-actions">
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}