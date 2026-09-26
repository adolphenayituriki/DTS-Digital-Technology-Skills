import React, { useEffect, useState } from 'react';
import {
  Search, Eye, X, KeyRound, BookOpen, FileText, RefreshCcw, Check, Trash2, GraduationCap, PlusCircle,
} from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const STATUS_META = {
  applicant: { label: 'Applicant', color: 'var(--primary)', bg: '#e8f6fd' },
  active: { label: 'Active Student', color: 'var(--success)', bg: '#f0fdf4' },
  rejected: { label: 'Rejected', color: 'var(--error)', bg: '#fef2f2' },
};

const autoGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function StudentsAdmin() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [intakeFilter, setIntakeFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [markDraft, setMarkDraft] = useState({ course: '', score: '', grade: '', remarks: '' });
  const [editMarkId, setEditMarkId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleteMarkId, setDeleteMarkId] = useState(null);
  const [pinResult, setPinResult] = useState(null);

  const fetchStudents = () => {
    setLoading(true);
    apiFetch('/students')
      .then((d) => setStudents(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(err.message || 'Failed to load students.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
    apiFetch('/intakes/all')
      .then((d) => setIntakes(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(err.message || 'Failed to load intakes.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      name: selected.name,
      phone: selected.phone || '',
      campus: selected.campus || '',
      program: selected.program || '',
      motivation: selected.motivation || '',
      remarks: selected.remarks || '',
    });
    setMarkDraft({ course: '', score: '', grade: '', remarks: '' });
    setEditMarkId(null);
    setPinResult(null);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const updateLocal = (updated) => {
    setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    if (selected?._id === updated._id) setSelected(updated);
  };

  const saveStudent = async () => {
    setSaving(true);
    try {
      const updated = await apiFetch(`/students/${selected._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          campus: draft.campus,
          program: draft.program,
          motivation: draft.motivation,
          remarks: draft.remarks,
          status: draft.status,
        }),
      });
      updateLocal(updated);
      toast.success('Student record updated.');
    } catch (err) {
      toast.error(err.message || 'Failed to save student record.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status) => {
    try {
      const updated = await apiFetch(`/students/${selected._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      updateLocal(updated);
      setDraft((d) => ({ ...d, status }));
      toast.success(`Student marked as ${STATUS_META[status].label}.`);
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    }
  };

  const resetPin = async () => {
    setResetting(true);
    try {
      const res = await apiFetch(`/students/${selected._id}/reset-pin`, { method: 'POST' });
      setPinResult(res);
      toast.success('New PIN generated and emailed to the student.', { grand: true });
    } catch (err) {
      toast.error(err.message || 'Failed to reset PIN.');
    } finally {
      setResetting(false);
    }
  };

  const addMark = async (e) => {
    e.preventDefault();
    const score = Number(markDraft.score);
    if (!markDraft.course.trim() || !Number.isFinite(score) || score < 0 || score > 100) {
      toast.error('Provide a course and a valid score (0-100).');
      return;
    }
    try {
      const updated = await apiFetch(`/students/${selected._id}/marks`, {
        method: 'POST',
        body: JSON.stringify({
          course: markDraft.course,
          score,
          grade: markDraft.grade || autoGrade(score),
          remarks: markDraft.remarks,
        }),
      });
      updateLocal(updated);
      setMarkDraft({ course: '', score: '', grade: '', remarks: '' });
      toast.success('Mark recorded.');
    } catch (err) {
      toast.error(err.message || 'Failed to record mark.');
    }
  };

  const updateMark = async (e) => {
    e.preventDefault();
    const score = Number(markDraft.score);
    if (!markDraft.course.trim() || !Number.isFinite(score) || score < 0 || score > 100) {
      toast.error('Provide a course and a valid score (0-100).');
      return;
    }
    try {
      const updated = await apiFetch(`/students/${selected._id}/marks/${editMarkId}`, {
        method: 'PUT',
        body: JSON.stringify({
          course: markDraft.course,
          score,
          grade: markDraft.grade || autoGrade(score),
          remarks: markDraft.remarks,
        }),
      });
      updateLocal(updated);
      setEditMarkId(null);
      setMarkDraft({ course: '', score: '', grade: '', remarks: '' });
      toast.success('Mark updated.');
    } catch (err) {
      toast.error(err.message || 'Failed to update mark.');
    }
  };

  const deleteMark = async () => {
    try {
      const updated = await apiFetch(`/students/${selected._id}/marks/${deleteMarkId}`, { method: 'DELETE' });
      updateLocal(updated);
      setDeleteMarkId(null);
      toast.success('Mark removed.', { celebrate: false });
    } catch (err) {
      toast.error(err.message || 'Failed to delete mark.');
    }
  };

  const startEditMark = (m) => {
    setEditMarkId(m._id);
    setMarkDraft({ course: m.course, score: String(m.score), grade: m.grade || '', remarks: m.remarks || '' });
  };

  const query = q.trim().toLowerCase();
  const filtered = students.filter(
    (s) =>
      (filter === 'all' || s.status === filter) &&
      (intakeFilter === 'all' || s.intakeId === intakeFilter) &&
      (!query ||
        [s.name, s.email, s.regNumber, s.phone, s.campus, s.intakeTitle, s.program, ...(s.preferredCourses || [])]
          .filter(Boolean)
          .some((v) => v.toString().toLowerCase().includes(query))),
  );

  const counts = {
    all: students.length,
    applicant: students.filter((s) => s.status === 'applicant').length,
    active: students.filter((s) => s.status === 'active').length,
    rejected: students.filter((s) => s.status === 'rejected').length,
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading students...</div>;

  return (
    <div>
      <div className="app-adm-head">
        <div>
          <h2 style={{ fontWeight: 700 }}>Students ({students.length})</h2>
          <p className="app-adm-sub">
            Every applicant is registered with a DTS number and PIN. Approving an application activates the student.
          </p>
        </div>
      </div>

      <div className="app-adm-toolbar">
        <div className="admin-filter-tabs">
          {['all', 'applicant', 'active', 'rejected'].map((f) => (
            <button
              key={f}
              className={`admin-filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {STATUS_META[f] ? STATUS_META[f].label : 'All'} ({counts[f]})
            </button>
          ))}
        </div>
        <select
          className="form-control"
          style={{ width: 'min(240px, 100%)' }}
          value={intakeFilter}
          onChange={(e) => setIntakeFilter(e.target.value)}
          aria-label="Filter by intake"
        >
          <option value="all">All intakes</option>
          {intakes.map((i) => (
            <option key={i._id} value={i._id}>{i.title}</option>
          ))}
        </select>
        <div className="search-box" style={{ width: 'min(300px, 100%)' }}>
          <Search size={15} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, reg #, email..."
            aria-label="Search students"
          />
        </div>
      </div>

      <table className="admin-table app-adm-table">
        <thead>
          <tr>
            <th>Reg Number</th>
            <th>Student</th>
            <th>Intake</th>
            <th>Status</th>
            <th>Marks</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2.5rem' }}>
              No students found for this view.
            </td></tr>
          )}
          {filtered.map((s) => {
            const meta = STATUS_META[s.status] || STATUS_META.applicant;
            return (
              <tr key={s._id} className="app-adm-row" onClick={() => setSelected(s)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(s); }}>
                <td>
                  <span className="student-reg-cell"><GraduationCap size={13} /> {s.regNumber}</span>
                </td>
                <td>
                  <div className="app-adm-cell">
                    <span className="app-adm-avatar">{initials(s.name)}</span>
                    <div>
                      <strong>{s.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{s.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{s.intakeTitle}</td>
                <td>
                  <span className="app-status-badge" style={{ color: meta.color, background: meta.bg }}>
                    {meta.label}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{(s.marks || []).length}</td>
                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setSelected(s)} title="View / edit">
                      <Eye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected && (
        <div className="dialog-overlay app-detail-overlay" onClick={() => setSelected(null)}>
          <div className="app-detail student-detail" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={`app-detail-head status-${selected.status}`}>
              <button className="dialog-close app-detail-close" onClick={() => setSelected(null)} aria-label="Close">
                <X size={18} />
              </button>
              <span className="app-detail-avatar">{initials(selected.name)}</span>
              <h3>{selected.name}</h3>
              <div className="student-detail-reg"><GraduationCap size={13} /> {selected.regNumber}</div>
              <span className="app-status-badge" style={{
                color: (STATUS_META[selected.status] || STATUS_META.applicant).color,
                background: (STATUS_META[selected.status] || STATUS_META.applicant).bg,
              }}>
                {(STATUS_META[selected.status] || STATUS_META.applicant).label}
              </span>
            </div>

            <div className="app-detail-body">
              <div className="app-detail-block">
                <div className="app-detail-label"><FileText size={15} /> Student Record</div>
                <div className="student-form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input className="form-control" value={draft?.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input className="form-control" value={draft?.phone || ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Campus / Location</label>
                    <input className="form-control" value={draft?.campus || ''} onChange={(e) => setDraft({ ...draft, campus: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Program / Level</label>
                    <input className="form-control" value={draft?.program || ''} onChange={(e) => setDraft({ ...draft, program: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Motivation</label>
                    <textarea className="form-control" rows={2} value={draft?.motivation || ''} onChange={(e) => setDraft({ ...draft, motivation: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Admin Remarks (shown on the student's profile)</label>
                    <textarea className="form-control" rows={2} value={draft?.remarks || ''} onChange={(e) => setDraft({ ...draft, remarks: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={saveStudent} disabled={saving}>
                    <Check size={14} /> {saving ? 'Saving...' : 'Save Record'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={resetPin} disabled={resetting}>
                    <KeyRound size={14} /> {resetting ? 'Generating...' : 'Reset PIN & Email'}
                  </button>
                </div>
                {pinResult && (
                  <div className="alert alert-info student-pin-result">
                    <strong>New PIN:</strong> <code>{pinResult.pin}</code>
                    <span style={{ fontSize: '0.8rem' }}> — also emailed to {selected.email}. Share it securely with the student.</span>
                  </div>
                )}
              </div>

              <div className="app-detail-block">
                <div className="app-detail-label"><RefreshCcw size={15} /> Enrolment Status</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '0 0 0.75rem' }}>
                  Accepting links the application and activates the student in the intake.
                </p>
                <div className="app-detail-actions">
                  {selected.status !== 'active' && (
                    <button className="btn btn-sm btn-success" onClick={() => changeStatus('active')}>
                      <Check size={14} /> Mark Active
                    </button>
                  )}
                  {selected.status !== 'rejected' && (
                    <button className="btn btn-sm btn-danger" onClick={() => changeStatus('rejected')}>
                      <X size={14} /> Reject
                    </button>
                  )}
                  {selected.status !== 'applicant' && (
                    <button className="btn btn-sm btn-outline" onClick={() => changeStatus('applicant')}>
                      <RefreshCcw size={14} /> Set Applicant
                    </button>
                  )}
                </div>
              </div>

              <div className="app-detail-block">
                <div className="app-detail-label"><BookOpen size={15} /> Marks</div>
                {Array.isArray(selected.marks) && selected.marks.length > 0 ? (
                  <table className="student-marks-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Score</th>
                        <th>Grade</th>
                        <th>Remarks</th>
                        <th style={{ width: 90 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.marks.map((m) => (
                        <tr key={m._id}>
                          <td>{m.course}</td>
                          <td>{m.score}%</td>
                          <td>{m.grade || '—'}</td>
                          <td>{m.remarks || '—'}</td>
                          <td>
                            <div className="actions">
                              <button className="btn btn-outline btn-xs" onClick={() => startEditMark(m)} title="Edit">
                                <FileText size={13} />
                              </button>
                              <button className="btn btn-danger btn-xs" onClick={() => setDeleteMarkId(m._id)} title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: 0 }}>No marks recorded yet.</p>
                )}

                <form onSubmit={editMarkId ? updateMark : addMark} className="mark-form">
                  <div className="student-form-grid">
                    <div className="form-group">
                      <label>Course</label>
                      <input
                        className="form-control"
                        list="student-course-options"
                        value={markDraft.course}
                        onChange={(e) => setMarkDraft({ ...markDraft, course: e.target.value })}
                        placeholder="e.g. Microsoft Office"
                      />
                      <datalist id="student-course-options">
                        {(selected.preferredCourses || []).map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label>Score (0-100)</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        max="100"
                        value={markDraft.score}
                        onChange={(e) => setMarkDraft({ ...markDraft, score: e.target.value, grade: autoGrade(Number(e.target.value) || 0) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Grade</label>
                      <input className="form-control" value={markDraft.grade} onChange={(e) => setMarkDraft({ ...markDraft, grade: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Remarks</label>
                      <input className="form-control" value={markDraft.remarks} onChange={(e) => setMarkDraft({ ...markDraft, remarks: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button type="submit" className="btn btn-outline btn-sm">
                      <PlusCircle size={14} /> {editMarkId ? 'Save Mark' : 'Add Mark'}
                    </button>
                    {editMarkId && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => { setEditMarkId(null); setMarkDraft({ course: '', score: '', grade: '', remarks: '' }); }}>
                        <X size={14} /> Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteMarkId}
        title="Remove this mark?"
        message="This will permanently remove the mark from the student's record."
        onConfirm={deleteMark}
        onCancel={() => setDeleteMarkId(null)}
      />
    </div>
  );
}