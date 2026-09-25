import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ClipboardCheck, Save } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

const statuses = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
];
const today = () => new Date().toISOString().slice(0, 10);

export default function TrainerAttendance() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState(searchParams.get('assignmentId') || '');
  const [intakeId, setIntakeId] = useState(searchParams.get('intakeId') || '');
  const [course, setCourse] = useState(searchParams.get('course') || '');
  const [sessionDate, setSessionDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/trainer/assignments')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAssignments(list);
        if (!assignmentId && list.length) {
          const first = list[0];
          const firstIntake = first.intakeId?._id || first.intakeId;
          setAssignmentId(first._id);
          setIntakeId(firstIntake);
          setCourse(first.course || '');
        }
      })
      .catch((error) => toast.error(error.message || 'Failed to load assignments.'))
      .finally(() => setLoading(false));
  }, [assignmentId, toast]);

  useEffect(() => {
    if (!intakeId) {
      setStudents([]);
      return;
    }
    const params = new URLSearchParams({ intakeId });
    if (course) params.set('course', course);
    Promise.all([
      apiFetch(`/trainer/students?${params.toString()}`),
      apiFetch(`/trainer/attendance?${params.toString()}&sessionDate=${sessionDate}`),
    ])
      .then(([studentData, attendanceData]) => {
        const list = Array.isArray(studentData) ? studentData : [];
        const records = Array.isArray(attendanceData) ? attendanceData : [];
        const next = {};
        list.forEach((student) => {
          const record = records.find((item) => String(item.studentId?._id || item.studentId) === student._id);
          next[student._id] = { status: record?.status || 'present', notes: record?.notes || '' };
        });
        setStudents(list);
        setEntries(next);
      })
      .catch((error) => toast.error(error.message || 'Failed to load attendance roster.'));
  }, [intakeId, course, sessionDate, toast]);

  const selectedAssignment = useMemo(() => assignments.find((item) => item._id === assignmentId), [assignments, assignmentId]);

  const selectAssignment = (value) => {
    const assignment = assignments.find((item) => item._id === value);
    if (!assignment) return;
    setAssignmentId(value);
    setIntakeId(assignment.intakeId?._id || assignment.intakeId);
    setCourse(assignment.course || '');
  };

  const setStatus = (studentId, status) => setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], status } }));
  const setNote = (studentId, notes) => setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], notes } }));
  const markAllPresent = () => setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, status: 'present' }])));

  const saveAttendance = async () => {
    if (!intakeId || !students.length) return;
    setSaving(true);
    try {
      await apiFetch('/trainer/attendance', {
        method: 'POST',
        body: JSON.stringify({ intakeId, sessionDate, course, entries: students.map((student) => ({ studentId: student._id, ...entries[student._id] })) }),
      });
      toast.success('Attendance saved successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading attendance...</div>;

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div><h2>Attendance Register</h2><p>Record one class session for your assigned intake and course.</p></div>
        <button type="button" className="btn btn-primary" onClick={saveAttendance} disabled={saving || !students.length}><Save size={15} /> {saving ? 'Saving...' : 'Save attendance'}</button>
      </div>
      <div className="attendance-toolbar">
        <select className="form-control" value={assignmentId} onChange={(e) => selectAssignment(e.target.value)}>
          <option value="">Choose an assignment</option>
          {assignments.map((assignment) => { const intake = assignment.intakeId || {}; return <option key={assignment._id} value={assignment._id}>{intake.title || 'Intake'}{assignment.course ? ` · ${assignment.course}` : ''}</option>; })}
        </select>
        <input className="form-control" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} aria-label="Session date" />
        <div className="attendance-course-label">{selectedAssignment?.course || course || 'All assigned courses'}</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={markAllPresent} disabled={!students.length}><Check size={14} /> Mark all present</button>
      </div>
      {!students.length ? <div className="alert alert-info">Choose an assignment with students to begin.</div> : (
        <div className="table-scroll">
          <table className="admin-table attendance-table">
            <thead><tr><th>Student</th><th>Registration</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              {students.map((student) => {
                const entry = entries[student._id] || { status: 'present', notes: '' };
                return <tr key={student._id}>
                  <td><strong>{student.name}</strong><small className="table-subtext">{student.email}</small></td>
                  <td>{student.regNumber}</td>
                  <td><div className="attendance-options">{statuses.map((status) => <button type="button" key={status.value} className={`attendance-choice ${entry.status === status.value ? `active ${status.value}` : ''}`} onClick={() => setStatus(student._id, status.value)}>{status.label}</button>)}</div></td>
                  <td><input className="form-control" value={entry.notes} onChange={(e) => setNote(student._id, e.target.value)} placeholder="Optional note" /></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
