import React, { useEffect, useRef, useState } from 'react';
import {
  Search, Eye, X, KeyRound, BookOpen, FileText, RefreshCcw, Check, Trash2, GraduationCap, PlusCircle,
} from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { gradeForScore } from '../../utils/grade';
import Avatar from '../../components/Avatar';
import Loading, { TableLoading } from '../../components/Loading';
import useDebounced from '../../hooks/useDebounced';

const STATUS_META = {
  applicant: { label: 'Applicant', color: 'var(--primary)', bg: '#e8f6fd' },
  active: { label: 'Active Student', color: 'var(--success)', bg: '#f0fdf4' },
  rejected: { label: 'Rejected', color: 'var(--error)', bg: '#fef2f2' },
};

// Shown before the first response arrives, and kept as the fallback shape so the
// tab labels always have four numbers to render.
const EMPTY_COUNTS = { all: 0, applicant: 0, active: 0, rejected: 0 };

const emptyMarkDraft = { course: '', score: '', grade: '', remarks: '', completed: false };

export default function StudentsAdmin() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  // A refetch from changing the status tab, the intake picker or the search box
  // must not blank the page - the toolbar (and the search box the user is typing
  // into) would collapse under a centred spinner. `refreshing` only reshapes the
  // table body.
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [intakeFilter, setIntakeFilter] = useState('all');
  const [q, setQ] = useState('');
  // The input stays bound to `q` so typing is instant; `searchTerm` is what
  // reaches the request.
  const searchTerm = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [markDraft, setMarkDraft] = useState(emptyMarkDraft);
  const [editMarkId, setEditMarkId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleteMarkId, setDeleteMarkId] = useState(null);
  const [deletingMark, setDeletingMark] = useState(false);
  const [pinResult, setPinResult] = useState(null);
  const abortRef = useRef(null);

  const buildQuery = (activePage) => {
    const params = new URLSearchParams({ page: String(activePage) });
    if (filter && filter !== 'all') params.set('status', filter);
    if (intakeFilter && intakeFilter !== 'all') params.set('intakeId', intakeFilter);
    const term = searchTerm.trim();
    if (term) params.set('q', term);
    return params.toString();
  };

  const fetchStudents = (activePage = 1, { background = false } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    // Cancel the request being superseded, so a slow response cannot land after
    // a faster one and put the wrong page back on screen.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    apiFetch(`/students?${buildQuery(activePage)}`, { signal: controller.signal })
      .then((d) => {
        // Legacy bare-array shape, kept only so an older cached server response
        // still renders instead of throwing on `d.items`.
        if (Array.isArray(d)) {
          setStudents(d);
          setTotal(d.length);
          setPages(1);
          setPage(1);
          return;
        }
        setStudents(Array.isArray(d?.items) ? d.items : []);
        setTotal(Number.isFinite(d?.total) ? d.total : 0);
        setPages(Number.isFinite(d?.pages) ? d.pages : 1);
        setPage(Number.isFinite(d?.page) ? d.page : activePage);
        if (d?.counts) setCounts({ ...EMPTY_COUNTS, ...d.counts });
      })
      .catch((err) => {
        // A superseded request is not a failure - aborts are rethrown by api.js
        // precisely so they can be told apart from real errors here.
        if (err?.name === 'AbortError') return;
        toast.error(err.message || 'Failed to load students.');
      })
      .finally(() => {
        // Only the request that is still current clears the indicator. A
        // superseded or unmounted request must not, or it would switch the
        // skeleton off while the newer request was still in flight.
        if (controller.signal.aborted || abortRef.current !== controller) return;
        setLoading(false);
        setRefreshing(false);
      });
  };

  // Re-runs when the tab, the intake picker or the (debounced) search term
  // changes, so every change returns to page 1 - staying on page 4 of a
  // different result set shows a wrong-looking list or an out-of-range empty
  // page. `loading` decides which of the two in-flight states this is: on the
  // very first run it is still true, so the page shows its centred spinner; by
  // the time a control changes it is false, so only the table body reshapes.
  useEffect(() => {
    fetchStudents(1, { background: !loading });
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, intakeFilter, searchTerm]);

  useEffect(() => {
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
    setMarkDraft(emptyMarkDraft);
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
      // Edits change what the current search/filter would return (a renamed
      // student may no longer match the query, or leave the status tab), so the
      // view is reconciled against the server without collapsing the table.
      fetchStudents(page, { background: true });
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
      // The status tabs and the possible membership of this row in the active
      // filter both changed, so pull the counts and drop/keep the row as needed.
      fetchStudents(page, { background: true });
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
          grade: markDraft.grade || gradeForScore(score),
          remarks: markDraft.remarks,
          completed: markDraft.completed,
        }),
      });
      updateLocal(updated);
      setMarkDraft(emptyMarkDraft);
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
          grade: markDraft.grade || gradeForScore(score),
          remarks: markDraft.remarks,
          completed: markDraft.completed,
        }),
      });
      updateLocal(updated);
      setEditMarkId(null);
      setMarkDraft(emptyMarkDraft);
      toast.success('Mark updated.');
    } catch (err) {
      toast.error(err.message || 'Failed to update mark.');
    }
  };

  const deleteMark = async () => {
    setDeletingMark(true);
    try {
      const updated = await apiFetch(`/students/${selected._id}/marks/${deleteMarkId}`, { method: 'DELETE' });
      updateLocal(updated);
      setDeleteMarkId(null);
      toast.success('Mark removed.', { celebrate: false });
    } catch (err) {
      toast.error(err.message || 'Failed to delete mark.');
    } finally {
      setDeletingMark(false);
    }
  };

  const startEditMark = (m) => {
    setEditMarkId(m._id);
    setMarkDraft({ course: m.course, score: String(m.score), grade: m.grade || '', remarks: m.remarks || '', completed: Boolean(m.completed) });
  };

  if (loading) return <Loading label="Loading students..." />;

  return (
    <div>
      <div className="app-adm-head">
        <div>
          {/* total from the server, not students.length - the latter is one
              page's worth once the list paginates. */}
          <h2 style={{ fontWeight: 700 }}>Students ({total})</h2>
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

      <table className="admin-table app-adm-table" aria-busy={refreshing}>
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
          {/* Shaped rows instead of the previous centred spinner: collapsing the
              table to a spinner while a filter refetches throws away the layout,
              and an empty table with no error reads as "nothing here". */}
          {refreshing ? (
            <TableLoading rows={6} cols={7} label="Loading students..." />
          ) : students.length === 0 ? (
            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2.5rem' }}>
              No students found for this view.
            </td></tr>
          ) : students.map((s) => {
            const meta = STATUS_META[s.status] || STATUS_META.applicant;
            return (
              <tr key={s._id} className="app-adm-row" onClick={() => setSelected(s)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(s); }}>
                <td>
                  <span className="student-reg-cell"><GraduationCap size={13} /> {s.regNumber}</span>
                </td>
                <td>
                  <div className="app-adm-cell">
                    <Avatar size="sm" name={s.name} />
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

      {pages > 1 && (
        <div className="pagination-bar">
          <span className="pagination-count">
            Showing {students.length} of {total} student{total === 1 ? '' : 's'}
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-outline btn-sm"
              disabled={loading || refreshing || page <= 1}
              onClick={() => fetchStudents(page - 1, { background: true })}
            >
              Previous
            </button>
            <span className="pagination-page">Page {page} of {pages}</span>
            <button
              className="btn btn-outline btn-sm"
              disabled={loading || refreshing || page >= pages}
              onClick={() => fetchStudents(page + 1, { background: true })}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="dialog-overlay app-detail-overlay" onClick={() => setSelected(null)}>
          <div className="app-detail student-detail" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={`app-detail-head status-${selected.status}`}>
              <button className="dialog-close app-detail-close" onClick={() => setSelected(null)} aria-label="Close">
                <X size={18} />
              </button>
              <Avatar size="lg" name={selected.name} />
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
                    <span style={{ fontSize: '0.8rem' }}> â€” also emailed to {selected.email}. Share it securely with the student.</span>
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
                        <th>Card</th>
                        <th style={{ width: 90 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.marks.map((m) => (
                        <tr key={m._id}>
                          <td>{m.course}</td>
                          <td>{m.score}%</td>
                          <td>{m.grade || 'â€”'}</td>
                          <td>{m.remarks || 'â€”'}</td>
                          <td>
                            {m.completed ? (
                              <span
                                title={m.completedAt ? `Completed ${new Date(m.completedAt).toLocaleDateString()}` : 'Completed'}
                                style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}
                              >
                                Ready
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>â€”</span>
                            )}
                          </td>
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
                        onChange={(e) => setMarkDraft({ ...markDraft, score: e.target.value, grade: e.target.value === '' ? '' : (gradeForScore(Number(e.target.value)) || '') })}
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
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.35rem',
                      fontSize: '0.85rem',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={markDraft.completed}
                      onChange={(e) => setMarkDraft({ ...markDraft, completed: e.target.checked })}
                    />
                    Course completed â€” unlocks the student's downloadable achievement card
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button type="submit" className="btn btn-outline btn-sm">
                      <PlusCircle size={14} /> {editMarkId ? 'Save Mark' : 'Add Mark'}
                    </button>
                    {editMarkId && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => { setEditMarkId(null); setMarkDraft(emptyMarkDraft); }}>
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
        loading={deletingMark}
        onConfirm={deleteMark}
        onCancel={() => setDeleteMarkId(null)}
      />
    </div>
  );
}