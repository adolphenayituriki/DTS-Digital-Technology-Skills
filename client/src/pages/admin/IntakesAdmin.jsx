import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, BookOpen, Save } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const emptyForm = { title: '', program: '', description: '', courses: [], courseDraft: '', startDate: '', endDate: '', deadline: '', capacity: 50, status: 'open' };

export default function IntakesAdmin() {
  const toast = useToast();
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [courseIntake, setCourseIntake] = useState(null);
  const [newCourse, setNewCourse] = useState('');

  const fetchIntakes = () => {
    setLoading(true);
    apiFetch('/intakes/all')
      .then((d) => setIntakes(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(err.message || 'Failed to load intakes.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchIntakes(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const addFormCourse = () => {
    const c = (form.courseDraft || '').trim();
    if (!c) return toast.error('Enter a course name first.');
    if (form.courses.includes(c)) return toast.error('This course is already added.');
    setForm((f) => ({ ...f, courses: [...f.courses, c], courseDraft: '' }));
  };

  const removeFormCourse = (c) => setForm((f) => ({ ...f, courses: f.courses.filter((x) => x !== c) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const wasEdit = !!editId;
    try {
      const payload = { ...form, capacity: Number(form.capacity) || 50 };
      delete payload.courseDraft;
      if (editId) {
        await apiFetch(`/intakes/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/intakes', { method: 'POST', body: JSON.stringify(payload) });
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      fetchIntakes();
      toast.success(wasEdit ? 'Intake updated successfully.' : 'Intake created successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to save intake.');
    }
  };

  const startEdit = (item) => {
    setForm({
      title: item.title || '',
      program: item.program || '',
      description: item.description || '',
      courses: Array.isArray(item.courses) ? [...item.courses] : [],
      courseDraft: '',
      startDate: item.startDate ? item.startDate.slice(0, 10) : '',
      endDate: item.endDate ? item.endDate.slice(0, 10) : '',
      deadline: item.deadline ? item.deadline.slice(0, 10) : '',
      capacity: item.capacity || 50,
      status: item.status || 'open',
    });
    setEditId(item._id);
    setShowForm(true);
  };

  const addCourse = () => {
    const c = (newCourse || '').trim();
    if (!c) return toast.error('Enter a course name.');
    if ((courseIntake.courses || []).includes(c)) return toast.error('This course is already added.');
    setCourseIntake((p) => ({ ...p, courses: [...(p.courses || []), c] }));
    setNewCourse('');
  };

  const removeCourse = (c) =>
    setCourseIntake((p) => ({ ...p, courses: (p.courses || []).filter((x) => x !== c) }));

  const saveCourses = async () => {
    try {
      await apiFetch(`/intakes/${courseIntake._id}`, { method: 'PUT', body: JSON.stringify({ courses: courseIntake.courses || [] }) });
      setIntakes((prev) => prev.map((i) => (i._id === courseIntake._id ? { ...i, courses: courseIntake.courses || [] } : i)));
      toast.success('Courses updated.');
      setCourseIntake(null);
      setNewCourse('');
    } catch (err) {
      toast.error(err.message || 'Failed to save courses.');
    }
  };

  const deleteIntake = async (id) => {
    try {
      await apiFetch(`/intakes/${id}`, { method: 'DELETE' });
      setIntakes((prev) => prev.filter((i) => i._id !== id));
      toast.success('Intake deleted.', { celebrate: false });
    } catch { /* ignore */ }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading intakes...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700 }}>Intakes ({intakes.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}>
          <Plus size={16} /> Add Intake
        </button>
      </div>

      {showForm && (
        <div className="card mb-3">
          <h3 style={{ marginBottom: '1rem' }}>{editId ? 'Edit Intake' : 'Add New Intake'}</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Title *</label>
                <input name="title" className="form-control" value={form.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Program *</label>
                <input name="program" className="form-control" value={form.program} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" className="form-control" rows={3} value={form.description} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Courses</label>
              <div className="chip-editor">
                {form.courses.length > 0 && (
                  <div className="chip-editor-list">
                    {form.courses.map((c) => (
                      <span className="chip" key={c}>
                        <span>{c}</span>
                        <button type="button" onClick={() => removeFormCourse(c)} aria-label={`Remove ${c}`}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="chip-editor-add">
                  <input
                    value={form.courseDraft}
                    onChange={(e) => setForm((f) => ({ ...f, courseDraft: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFormCourse(); } }}
                    placeholder="Add a course and press Enter"
                    aria-label="New course name"
                  />
                  <button type="button" onClick={addFormCourse} className="btn btn-outline btn-sm">
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" name="startDate" className="form-control" value={form.startDate} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" name="endDate" className="form-control" value={form.endDate} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input type="date" name="deadline" className="form-control" value={form.deadline} onChange={handleChange} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Capacity</label>
                <input type="number" name="capacity" className="form-control" value={form.capacity} onChange={handleChange} min={1} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="full">Full</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-success btn-sm">{editId ? 'Update' : 'Create'}</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
<tr>
              <th>Title</th>
              <th>Program</th>
              <th>Courses</th>
              <th>Enrolled</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {intakes.map((item) => (
              <tr key={item._id}>
                <td><strong>{item.title}</strong></td>
                <td>{item.program}</td>
                <td>
                  {Array.isArray(item.courses) && item.courses.length > 0 ? (
                    <span style={{ display: 'block' }}>{item.courses.join(', ')}</span>
                  ) : (
                    <span style={{ color: 'var(--text-light)' }}>—</span>)}
                </td>
                <td>{item.enrolled || 0} / {item.capacity}</td>
              <td style={{ fontSize: '0.85rem' }}>
                {item.deadline ? new Date(item.deadline).toLocaleDateString() : '—'}
              </td>
              <td>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
                  color: item.status === 'open' ? 'var(--success)' : item.status === 'full' ? 'var(--warning)' : 'var(--text-light)',
                }}>
                  {item.status}
                </span>
              </td>
              <td>
                <div className="actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setCourseIntake({ ...item, courses: item.courses || [] })} title="Manage courses">
                    <BookOpen size={14} />
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(item)}><Edit size={14} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(item._id)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {courseIntake && (
        <div className="dialog-overlay" onClick={() => setCourseIntake(null)}>
          <div className="dialog-card course-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => setCourseIntake(null)} aria-label="Close">
              <X size={16} />
            </button>
            <div className="dialog-icon course-modal-icon">
              <BookOpen size={22} />
            </div>
            <h3>Manage Courses</h3>
            <p>
              Add or remove courses for <strong>{courseIntake.title}</strong> ({courseIntake.program} level).
            </p>
            <div className="chip-editor">
              {courseIntake.courses.length > 0 ? (
                <div className="chip-editor-list">
                  {courseIntake.courses.map((c) => (
                    <span className="chip" key={c}>
                      <span>{c}</span>
                      <button type="button" onClick={() => removeCourse(c)} aria-label={`Remove ${c}`}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="chip-editor-empty">No courses yet. Add the first one below.</p>
              )}
              <div className="chip-editor-add">
                <input
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCourse(); } }}
                  placeholder="e.g. Computer Graphics"
                  aria-label="New course name"
                />
                <button type="button" onClick={addCourse} className="btn btn-outline btn-sm">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="dialog-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setCourseIntake(null)}>Close</button>
              <button className="btn btn-success btn-sm" onClick={saveCourses}>
                <Save size={14} /> Save Courses
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this intake?"
        message="This will permanently remove the intake. Existing applications for it will remain but without an active intake."
        onConfirm={async () => { await deleteIntake(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}