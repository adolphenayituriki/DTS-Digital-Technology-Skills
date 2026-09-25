import React, { useEffect, useState } from 'react';
import { Plus, Trash2, User, BookOpen, Save, X, Search } from 'lucide-react';
import apiFetch from '../../api';
import { useToast } from '../../components/Toast';

export default function TrainerAssignments() {
  const toast = useToast();
  const [trainers, setTrainers] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ trainerId: '', intakeId: '', course: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/trainer-assignments'),
      apiFetch('/admin/trainers'),
      apiFetch('/finance/intakes'),
    ])
      .then(([assignmentsData, trainersData, intakesData]) => {
        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        setTrainers(Array.isArray(trainersData) ? trainersData : []);
        setIntakes(Array.isArray(intakesData) ? intakesData : []);
      })
      .catch((err) => toast.error(err.message || 'Failed to load data.'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.trainerId || !form.intakeId) {
      toast.error('Select a trainer and an intake.');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/admin/trainer-assignments/${editing}` : '/admin/trainer-assignments';
      const method = editing ? 'PUT' : 'POST';
      await apiFetch(url, { method, body: JSON.stringify(form) });
      toast.success(editing ? 'Assignment updated.' : 'Assignment created.');
      setShowForm(false);
      setEditing(null);
      setForm({ trainerId: '', intakeId: '', course: '' });
      const updated = await apiFetch('/admin/trainer-assignments');
      setAssignments(Array.isArray(updated) ? updated : []);
    } catch (err) {
      toast.error(err.message || 'Failed to save assignment.');
    } finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await apiFetch(`/admin/trainer-assignments/${id}`, { method: 'DELETE' });
      toast.success('Assignment removed.');
      const updated = await apiFetch('/admin/trainer-assignments');
      setAssignments(Array.isArray(updated) ? updated : []);
    } catch (err) { toast.error(err.message || 'Failed to delete.'); }
  };
  const handleEdit = (a) => {
    setEditing(a._id);
    setForm({ trainerId: a.trainerId._id, intakeId: a.intakeId._id, course: a.course });
    setShowForm(true);
  };
  const handleCancel = () => { setShowForm(false); setEditing(null); setForm({ trainerId: '', intakeId: '', course: '' }); };

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>Trainer Assignments</h2>
          <p>Assign trainers to intakes and courses.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Assignment
        </button>
      </div>

      {showForm && (
        <div className="dialog-overlay" onClick={handleCancel}>
          <div className="dialog-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <button className="dialog-close" onClick={handleCancel}><X size={18} /></button>
            <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Assignment' : 'New Assignment'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label>Trainer</label>
                <select className="form-control" name="trainerId" value={form.trainerId} onChange={handleChange} required>
                  <option value="">Select trainer</option>
                  {trainers.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Intake / Level</label>
                <select className="form-control" name="intakeId" value={form.intakeId} onChange={handleChange} required>
                  <option value="">Select intake</option>
                  {intakes.map((i) => <option key={i._id} value={i._id}>{i.title} {i.program ? `· ${i.program}` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Course (optional)</label>
                <input className="form-control" name="course" value={form.course} onChange={handleChange} placeholder="e.g. Google Services" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={handleCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={14} /> {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h3>Assignments</h3>
        </div>
        {assignments.length === 0 ? (
          <p style={{ color: 'var(--text-light)', padding: '2rem', textAlign: 'center' }}>No assignments yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Trainer</th>
                  <th>Intake / Level</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} color="var(--primary)" />
                        <div>
                          <strong>{a.trainerId?.name || '—'}</strong>
                          <div className="table-subtext">{a.trainerId?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{a.intakeId?.title || '—'}</strong>
                      {a.intakeId?.program && <div className="table-subtext">{a.intakeId.program}</div>}
                    </td>
                    <td>{a.course || <span className="table-subtext">All courses</span>}</td>
                    <td><span className={`finance-status ${a.active ? 'status-paid' : 'status-neutral'}`}>{a.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-outline btn-xs" onClick={() => handleEdit(a)} title="Edit"><BookOpen size={13} /></button>
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(a._id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}