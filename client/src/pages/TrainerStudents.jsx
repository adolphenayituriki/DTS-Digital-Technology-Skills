import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardCheck, Search } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

export default function TrainerStudents() {
  const toast = useToast();
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ intakeId: '', course: '', q: '' });

  useEffect(() => {
    apiFetch('/trainer/assignments')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAssignments(list);
        if (list.length && !filters.intakeId) setFilters((current) => ({ ...current, intakeId: list[0].intakeId?._id || list[0].intakeId || '', course: list[0].course || '' }));
      })
      .catch((error) => toast.error(error.message || 'Failed to load assignments.'));
  }, [filters.intakeId, toast]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.intakeId) params.set('intakeId', filters.intakeId);
    if (filters.course) params.set('course', filters.course);
    if (filters.q) params.set('q', filters.q);
    apiFetch(`/trainer/students?${params.toString()}`)
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(error.message || 'Failed to load students.'))
      .finally(() => setLoading(false));
  }, [filters, toast]);

  const selectedAssignment = assignments.find((item) => (item.intakeId?._id || item.intakeId) === filters.intakeId);
  const courseOptions = selectedAssignment?.intakeId?.courses || [];

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div><h2>My Students</h2><p>Only students in your assigned intakes and courses are shown.</p></div>
        <div className="workspace-actions">
          <Link to="/trainer/attendance" className="btn btn-outline btn-sm"><ClipboardCheck size={14} /> Attendance</Link>
          <Link to="/trainer/marks" className="btn btn-primary btn-sm"><BookOpen size={14} /> Marks</Link>
        </div>
      </div>
      <div className="app-adm-toolbar">
        <select className="form-control workspace-filter" value={filters.intakeId} onChange={(e) => {
          const next = assignments.find((item) => (item.intakeId?._id || item.intakeId) === e.target.value);
          setFilters((current) => ({ ...current, intakeId: e.target.value, course: next?.course || '' }));
        }}>
          <option value="">All assigned intakes</option>
          {assignments.map((assignment) => {
            const intake = assignment.intakeId || {};
            const id = intake._id || assignment.intakeId;
            return <option key={id} value={id}>{intake.title || 'Intake'}{assignment.course ? ` · ${assignment.course}` : ''}</option>;
          })}
        </select>
        <select className="form-control workspace-filter" value={filters.course} onChange={(e) => setFilters((current) => ({ ...current, course: e.target.value }))}>
          <option value="">All assigned courses</option>
          {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
        </select>
        <div className="search-box workspace-search"><Search size={15} /><input type="search" value={filters.q} onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))} placeholder="Search students..." /></div>
      </div>
      {loading ? <div className="loading"><div className="spinner" />Loading roster...</div> : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead><tr><th>Registration</th><th>Student</th><th>Intake</th><th>Courses</th><th>Marks</th><th>Actions</th></tr></thead>
            <tbody>
              {students.length === 0 && <tr><td colSpan={6} className="table-empty">No students found for this assignment.</td></tr>}
              {students.map((student) => (
                <tr key={student._id}>
                  <td><span className="student-reg-cell">{student.regNumber}</span></td>
                  <td><strong>{student.name}</strong><small className="table-subtext">{student.email}</small></td>
                  <td>{student.intakeTitle}</td>
                  <td>{(student.preferredCourses || []).join(', ') || student.program || '—'}</td>
                  <td>{(student.marks || []).length}</td>
                  <td><div className="actions"><Link className="btn btn-outline btn-xs" to={`/trainer/marks?intakeId=${encodeURIComponent(student.intakeId)}&course=${encodeURIComponent(filters.course || student.preferredCourses?.[0] || '')}&studentId=${student._id}`}><BookOpen size={13} /></Link><Link className="btn btn-outline btn-xs" to={`/trainer/attendance?intakeId=${encodeURIComponent(student.intakeId)}&course=${encodeURIComponent(filters.course || '')}`}><ClipboardCheck size={13} /></Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
