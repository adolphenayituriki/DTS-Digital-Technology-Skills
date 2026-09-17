import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const emptyForm = { name: '', role: '', bio: '', email: '' };

export default function MembersAdmin() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const fetchMembers = () => {
    apiFetch('/members')
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const wasEdit = !!editId;
    try {
      if (editId) {
        await apiFetch(`/members/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/members', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      fetchMembers();
      toast.success(wasEdit ? 'Member updated successfully.' : 'Member added successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to save member.');
    }
  };

  const startEdit = (m) => {
    setForm({ name: m.name, role: m.role, bio: m.bio || '', email: m.email || '' });
    setEditId(m._id);
    setShowForm(true);
  };

  const deleteMember = async (id) => {
    try {
      await apiFetch(`/members/${id}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m._id !== id));
      toast.success('Member deleted.');
    } catch { /* ignore */ }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading members...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700 }}>Members ({members.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {showForm && (
        <div className="card mb-3">
          <h3 style={{ marginBottom: '1rem' }}>{editId ? 'Edit Member' : 'Add New Member'}</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Name *</label>
                <input name="name" className="form-control" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <input name="role" className="form-control" value={form.role} onChange={handleChange} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Email</label>
                <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea name="bio" className="form-control" rows={2} value={form.bio} onChange={handleChange} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-success btn-sm">{editId ? 'Update' : 'Create'}</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m._id}>
              <td><strong>{m.name}</strong></td>
              <td>{m.role}</td>
              <td style={{ fontSize: '0.85rem' }}>{m.email || '-'}</td>
              <td>
                <div className="actions">
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(m)}><Edit size={14} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(m._id)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this member?"
        message="This will permanently remove the member from the team page."
        onConfirm={async () => { await deleteMember(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
