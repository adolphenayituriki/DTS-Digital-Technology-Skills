import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Save } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

const gradeForScore = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

export default function TrainerMarks() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [intakeId, setIntakeId] = useState(searchParams.get('intakeId') || '');
  const [course, setCourse] = useState(searchParams.get('course') || '');
  const [students, setStudents] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    apiFetch('/trainer/assignments')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAssignments(list);
        const matching = list.find((item) => String(item.intakeId?._id || item.intakeId) === intakeId && (!course || item.course === course));
        const first = matching || list[0];
        if (first && !assignmentId) {
          setAssignmentId(first._id);
          setIntakeId(first.intakeId?._id || first.intakeId);
          setCourse(first.course || course || '');
        }
      })
      .catch((error) => toast.error(error.message || 'Failed to load assignments.'))
      .finally(() => setLoading(false));
  }, [assignmentId, course, intakeId, toast]);

  useEffect(() => {
    if (!intakeId) {
      setStudents([]);
      return;
    }
    const params = new URLSearchParams({ intakeId });
    if (course) params.set('course', course);
    apiFetch(`/trainer/students?${params.toString()}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const next = {};
        list.forEach((student) => {
          const mark = (student.marks || []).find((item) => !course || item.course.toLowerCase() === course.toLowerCase());
          next[student._id] = { score: mark?.score ?? '', remarks: mark?.remarks || '', markId: mark?._id || '' };
        });
        setStudents(list);
        setDrafts(next);
      })
      .catch((error) => toast.error(error.message || 'Failed to load students.'));
  }, [intakeId, course, toast]);

  const selectedAssignment = useMemo(() => assignments.find((item) => item._id === assignmentId), [assignments, assignmentId]);
  const selectedIntake = selectedAssignment?.intakeId;
  const selectAssignment = (value) => {
    const assignment = assignments.find((item) => item._id === value);
    if (!assignment) return;
    setAssignmentId(value);
    setIntakeId(assignment.intakeId?._id || assignment.intakeId);
    setCourse(assignment.course || '');
  };
  const updateDraft = (studentId, key, value) => setDrafts((current) => ({ ...current, [studentId]: { ...current[studentId], [key]: value } }));

  const saveMark = async (student) => {
    const draft = drafts[student._id] || {};
    const score = Number(draft.score);
    if (!course) {
      toast.error('Enter a course before saving the mark.');
      return;
    }
    if (draft.score === '' || !Number.isFinite(score) || score < 0 || score > 100) {
      toast.error(`Enter a valid score for ${student.name}.`);
      return;
    }
    setSavingId(student._id);
    try {
      const path = draft.markId ? `/trainer/students/${student._id}/marks/${draft.markId}` : `/trainer/students/${student._id}/marks`;
      const updated = await apiFetch(path, { method: draft.markId ? 'PUT' : 'POST', body: JSON.stringify({ course, score, remarks: draft.remarks }) });
      setStudents((current) => current.map((item) => item._id === student._id ? updated : item));
      setDrafts((current) => ({ ...current, [student._id]: { ...current[student._id], markId: (updated.marks || []).find((mark) => mark.course === course)?._id || draft.markId } }));
      toast.success(`Mark saved for ${student.name}.`);
    } catch (error) {
      toast.error(error.message || 'Failed to save mark.');
    } finally {
      setSavingId('');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading marks...</div>;

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div><h2>Marks Entry</h2><p>Enter or update assessment scores for students in your assigned class.</p></div>
        <div className="workspace-course-chip"><BookOpen size={15} /> {selectedAssignment?.course || course || 'Choose a course'}</div>
      </div>
      <div className="attendance-toolbar">
        <select className="form-control" value={assignmentId} onChange={(e) => selectAssignment(e.target.value)}>
          <option value="">Choose an assignment</option>
          {assignments.map((assignment) => { const intake = assignment.intakeId || {}; return <option key={assignment._id} value={assignment._id}>{intake.title || 'Intake'}{assignment.course ? ` · ${assignment.course}` : ''}</option>; })}
        </select>
        <input className="form-control" list="trainer-course-options" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Enter course name" aria-label="Course name" />
        <datalist id="trainer-course-options">{(selectedIntake?.courses || []).map((item) => <option key={item} value={item} />)}</datalist>
        <div className="attendance-course-label">{intakeId ? 'Scores are saved individually' : 'Choose an assignment to begin'}</div>
      </div>
      {!students.length ? <div className="alert alert-info">No students are assigned to this class yet.</div> : (
        <div className="table-scroll">
          <table className="admin-table marks-entry-table">
            <thead><tr><th>Student</th><th>Score (0-100)</th><th>Grade</th><th>Remarks</th><th>Action</th></tr></thead>
            <tbody>
              {students.map((student) => {
                const draft = drafts[student._id] || {};
                const score = draft.score === '' ? null : Number(draft.score);
                return <tr key={student._id}>
                  <td><strong>{student.name}</strong><small className="table-subtext">{student.regNumber}</small></td>
                  <td><input className="form-control mark-score-input" type="number" min="0" max="100" value={draft.score} onChange={(e) => updateDraft(student._id, 'score', e.target.value)} /></td>
                  <td><span className="grade-badge">{score !== null && Number.isFinite(score) ? gradeForScore(score) : '—'}</span></td>
                  <td><input className="form-control" value={draft.remarks} onChange={(e) => updateDraft(student._id, 'remarks', e.target.value)} placeholder="Optional remark" /></td>
                  <td><button type="button" className="btn btn-primary btn-xs" onClick={() => saveMark(student)} disabled={savingId === student._id}><Save size={13} /> {savingId === student._id ? 'Saving' : 'Save'}</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
