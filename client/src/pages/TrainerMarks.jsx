import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Check, ClipboardList, Plus, Save, Trash2 } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';
import { gradeForScore } from '../utils/grade';
import { ASSESSMENT_TYPES, DEFAULT_ASSESSMENT_NO, assessmentTypeLabel } from '../utils/options';
import ConfirmDialog from '../components/ConfirmDialog';

const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

// The identity of one assessment on one course. Marks saved before assessment
// types existed have none, and match the blank slot rather than Quiz 1.
const assessmentKey = (course, type, no) =>
  `${String(course || '').trim().toLowerCase()}::${String(type || '')}::${Number(no) || DEFAULT_ASSESSMENT_NO}`;

const labelFor = (assessment) =>
  assessment.assessmentType
    ? `${assessmentTypeLabel(assessment.assessmentType)} ${assessment.assessmentNo}`
    : 'Assessment';

export default function TrainerMarks() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [intakeId, setIntakeId] = useState(searchParams.get('intakeId') || '');
  const [course, setCourse] = useState(searchParams.get('course') || '');
  const [students, setStudents] = useState([]);
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // What is being marked. Defaults to Quiz 1 on today, which is the most common
  // thing a trainer opens this page to do.
  const [assessment, setAssessment] = useState({
    assessmentType: 'quiz',
    assessmentNo: '1',
    assessmentDate: today(),
  });
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    apiFetch('/trainer/assignments')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAssignments(list);
        const matching = list.find(
          (item) => String(item.intakeId?._id || item.intakeId) === intakeId && (!course || item.course === course),
        );
        const first = matching || list[0];
        if (first && !assignmentId) {
          setAssignmentId(first._id);
          setIntakeId(first.intakeId?._id || first.intakeId);
          setCourse(first.course || course || '');
        }
      })
      .catch((error) => toast.error(error.message || 'Failed to load assignments.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAssignment = useMemo(
    () => assignments.find((item) => item._id === assignmentId),
    [assignments, assignmentId],
  );
  const selectedIntake = selectedAssignment?.intakeId;

  const query = useMemo(() => {
    if (!intakeId) return '';
    const params = new URLSearchParams({ intakeId });
    if (course) params.set('course', course);
    return params.toString();
  }, [intakeId, course]);

  // Roster and the assessments already recorded for this class, together.
  useEffect(() => {
    if (!query) {
      setStudents([]);
      setExisting([]);
      return;
    }
    Promise.all([
      apiFetch(`/trainer/students?${query}`),
      apiFetch(`/trainer/assessments?${query}`),
    ])
      .then(([studentData, assessmentData]) => {
        setStudents(Array.isArray(studentData) ? studentData : []);
        setExisting(Array.isArray(assessmentData) ? assessmentData : []);
      })
      .catch((error) => toast.error(error.message || 'Failed to load the class.'));
  }, [query, toast]);

  // Re-seed the entry sheet whenever the assessment being marked changes, so the
  // trainer sees the scores already stored rather than a blank grid.
  useEffect(() => {
    if (!course || !students.length) {
      setDrafts({});
      return;
    }
    const wanted = assessmentKey(course, assessment.assessmentType, assessment.assessmentNo);
    const next = {};
    students.forEach((student) => {
      const mark = (student.marks || []).find(
        (item) => assessmentKey(item.course, item.assessmentType, item.assessmentNo) === wanted,
      );
      next[student._id] = {
        score: mark?.score ?? '',
        remarks: mark?.remarks || '',
        markId: mark?._id || '',
      };
    });
    setDrafts(next);
  }, [course, assessment.assessmentType, assessment.assessmentNo, students]);

  const selectAssignment = (value) => {
    const assignment = assignments.find((item) => item._id === value);
    if (!assignment) return;
    setAssignmentId(value);
    setIntakeId(assignment.intakeId?._id || assignment.intakeId);
    setCourse(assignment.course || '');
  };

  const update = (studentId, key, value) =>
    setDrafts((current) => ({ ...current, [studentId]: { ...current[studentId], [key]: value } }));

  const updateAssessment = (key, value) => setAssessment((current) => ({ ...current, [key]: value }));

  const filled = students.filter((student) => {
    const draft = drafts[student._id];
    return draft && draft.score !== '' && draft.score !== null;
  });
  const invalid = filled.filter((student) => {
    const score = Number(drafts[student._id].score);
    return !Number.isFinite(score) || score < 0 || score > 100;
  });
  const average = filled.length
    ? Math.round(
      (filled.reduce((total, student) => total + Number(drafts[student._id].score || 0), 0) / filled.length) * 10,
    ) / 10
    : null;

  const save = async () => {
    if (!course) {
      toast.error('Choose a course before saving.');
      return;
    }
    if (!filled.length) {
      toast.error('Enter a score for at least one student.');
      return;
    }
    if (invalid.length) {
      toast.error(`Scores must be between 0 and 100 (${invalid.length} invalid).`);
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch('/trainer/marks/bulk', {
        method: 'POST',
        body: JSON.stringify({
          course,
          assessmentType: assessment.assessmentType,
          assessmentNo: Number(assessment.assessmentNo) || DEFAULT_ASSESSMENT_NO,
          assessmentDate: assessment.assessmentDate,
          // Blank cells are sent as blank so the server skips them rather than
          // recording a zero for a student the trainer left alone.
          entries: students.map((student) => ({
            studentId: student._id,
            score: drafts[student._id]?.score ?? '',
            remarks: drafts[student._id]?.remarks || '',
          })),
        }),
      });
      toast.success(
        result?.message || 'Marks saved',
        { celebrate: false },
      );
      const assessmentData = await apiFetch(`/trainer/assessments?${query}`);
      setExisting(Array.isArray(assessmentData) ? assessmentData : []);
      const studentData = await apiFetch(`/trainer/students?${query}`);
      setStudents(Array.isArray(studentData) ? studentData : []);
    } catch (error) {
      toast.error(error.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading marks...</div>;

  const typeOptions = ASSESSMENT_TYPES;

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>Marks Entry</h2>
          <p>Record a quiz, exercise, assignment, CAT or exam for the whole class in one save.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !filled.length}>
          <Save size={15} /> {saving ? 'Saving...' : `Save ${filled.length || ''} mark${filled.length === 1 ? '' : 's'}`.trim()}
        </button>
      </div>

      <div className="attendance-toolbar">
        <select className="form-control" value={assignmentId} onChange={(e) => selectAssignment(e.target.value)} aria-label="Class">
          <option value="">Choose a class</option>
          {assignments.map((assignment) => {
            const intake = assignment.intakeId || {};
            return <option key={assignment._id} value={assignment._id}>{intake.title || 'Intake'}{assignment.course ? ` · ${assignment.course}` : ''}</option>;
          })}
        </select>
        <input
          className="form-control"
          list="trainer-course-options"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="Course"
          aria-label="Course name"
        />
        <datalist id="trainer-course-options">
          {(selectedIntake?.courses || []).map((item) => <option key={item} value={item} />)}
        </datalist>
      </div>

      {!students.length ? (
        <div className="alert alert-info">No students are assigned to this class yet.</div>
      ) : (
        <>
          {/* The assessment being marked. This is the thing the old page had no
              concept of: every mark was "the" score for a course, so a second
              quiz overwrote the first. */}
          <div className="marks-builder">
            <div className="marks-builder-head">
              <h3><Plus size={15} /> Assessment</h3>
              <div className="marks-builder-preset">
                {typeOptions.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`marks-type-chip${assessment.assessmentType === type.value ? ' is-active' : ''}`}
                    onClick={() => updateAssessment('assessmentType', type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="marks-builder-fields">
              <div className="form-group">
                <label htmlFor="mark-type">Type</label>
                <select
                  id="mark-type"
                  className="form-control"
                  value={assessment.assessmentType}
                  onChange={(e) => updateAssessment('assessmentType', e.target.value)}
                >
                  {typeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div className="form-group is-narrow">
                <label htmlFor="mark-no">Number</label>
                <input
                  id="mark-no"
                  className="form-control"
                  type="number"
                  min="1"
                  max="50"
                  value={assessment.assessmentNo}
                  onChange={(e) => updateAssessment('assessmentNo', e.target.value)}
                />
              </div>
              <div className="form-group is-narrow">
                <label htmlFor="mark-date">Date</label>
                <input
                  id="mark-date"
                  className="form-control"
                  type="date"
                  value={assessment.assessmentDate}
                  onChange={(e) => updateAssessment('assessmentDate', e.target.value)}
                />
              </div>
            </div>
            <p className="marks-builder-name">
              Saving as <b>{labelFor({ ...assessment, assessmentNo: Number(assessment.assessmentNo) || 1 })}</b>
              {' '}· {course || 'no course chosen'} · {shortDate(assessment.assessmentDate)}
            </p>
          </div>

          {/* What already exists for this class, so a trainer can see the
              quizzes and exams recorded so far and jump back into one. */}
          {existing.length > 0 && (
            <div className="marks-existing">
              <h3><ClipboardList size={15} /> Recorded for this class</h3>
              <div className="marks-existing-list">
                {existing.map((item) => {
                  const key = assessmentKey(item.course, item.assessmentType, item.assessmentNo);
                  const isCurrent = key === assessmentKey(course, assessment.assessmentType, assessment.assessmentNo);
                  return (
                    <button
                      key={`${key}-${item.assessmentDate}`}
                      type="button"
                      className={`marks-existing-chip${isCurrent ? ' is-active' : ''}`}
                      onClick={() => setAssessment({
                        assessmentType: item.assessmentType || 'quiz',
                        assessmentNo: String(item.assessmentNo || DEFAULT_ASSESSMENT_NO),
                        assessmentDate: String(item.assessmentDate || '').slice(0, 10) || today(),
                      })}
                      title={`${item.recorded} of ${students.length} students · average ${item.average}%`}
                    >
                      <b>{labelFor(item)}</b>
                      <span>{shortDate(item.assessmentDate)}</span>
                      <i>{item.average}%</i>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="table-scroll">
            <table className="admin-table marks-entry-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="is-narrow">Score</th>
                  <th className="is-narrow">Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const draft = drafts[student._id] || {};
                  const score = draft.score === '' || draft.score === null ? null : Number(draft.score);
                  const bad = score !== null && (!Number.isFinite(score) || score < 0 || score > 100);
                  return (
                    <tr key={student._id} className={draft.score !== '' && draft.score !== null ? 'is-marked' : undefined}>
                      <th scope="row" className="marks-student">
                        <strong>{student.name}</strong>
                        <small>{student.regNumber}</small>
                      </th>
                       <td style={{ width: '160px' }}>
                         <input
                           className={`form-control mark-score-input${bad ? ' is-invalid' : ''}`}
                           type="text"
                           inputMode="decimal"
                           pattern="[0-9]*\.?[0-9]{0,2}"
                           value={draft.score ?? ''}
                           onChange={(e) => {
                             const v = e.target.value.replace(/[^0-9.]/g, '');
                             const parts = v.split('.');
                             if (parts.length > 2) return;
                             if (parts[1] && parts[1].length > 2) return;
                             update(student._id, 'score', v);
                           }}
                           onBlur={(e) => {
                             const num = Number(e.target.value);
                             if (Number.isFinite(num) && num >= 0 && num <= 100) {
                               const formatted = num % 1 === 0 ? String(num) : num.toFixed(2);
                               update(student._id, 'score', formatted);
                             }
                           }}
                           placeholder="0 - 100"
                           aria-label={`Score for ${student.name}`}
                         />
                       </td>
                      <td className="is-narrow">
                        <span className={`grade-badge${bad ? ' is-invalid' : ''}`}>
                          {bad ? '!' : score !== null && Number.isFinite(score) ? gradeForScore(score) : '—'}
                        </span>
                      </td>
                      <td>
                        <input
                          className="form-control"
                          value={draft.remarks || ''}
                          onChange={(e) => update(student._id, 'remarks', e.target.value)}
                          placeholder="Optional remark"
                          aria-label={`Remark for ${student.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="marks-summary">
            <span className="marks-summary-chip"><b>{filled.length}</b> of {students.length} filled</span>
            {average !== null && <span className="marks-summary-chip is-average"><b>{average}%</b> class average</span>}
            {invalid.length > 0 && <span className="marks-summary-chip is-bad"><b>{invalid.length}</b> out of range</span>}
            {filled.length > 0 && !invalid.length && (
              <span className="marks-summary-chip is-ready"><Check size={12} /> Ready to save</span>
            )}
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => setConfirmClear(true)}
              disabled={!filled.length}
            >
              <Trash2 size={12} /> Clear this sheet
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear this sheet?"
        message="Blank every score in the entry grid so you can start this assessment again. Nothing already saved to the database is changed."
        confirmLabel="Clear sheet"
        loading={saving}
        onConfirm={() => {
          setDrafts(Object.fromEntries(students.map((s) => [s._id, { score: '', remarks: '', markId: '' }])));
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
