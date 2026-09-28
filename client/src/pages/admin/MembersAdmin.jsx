import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Camera, X } from 'lucide-react';
import apiFetch, { API_URL, TOKEN_KEY, getApiOrigin } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import Avatar from '../../components/Avatar';

const emptyForm = { name: '', role: '', bio: '', email: '', photo: '' };

export default function MembersAdmin() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchMembers = () => {
    setLoading(true);
    apiFetch('/members')
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(err.message || 'Failed to load members.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMembers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Member.photo has always existed on the model and round-tripped through
  // POST/PUT, but the form never sent it, so a member could only ever get a
  // photo by editing the database by hand.
  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setForm((f) => ({ ...f, photo: getApiOrigin() + data.url }));
    } catch (err) {
      toast.error(err.message || 'Could not upload that image.');
    } finally {
      setUploading(false);
    }
  };

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
    setForm({
      name: m.name,
      role: m.role,
      bio: m.bio || '',
      email: m.email || '',
      photo: m.photo || '',
    });
    setEditId(m._id);
    setShowForm(true);
  };

  const deleteMember = async (id) => {
    try {
      await apiFetch(`/members/${id}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m._id !== id));
      toast.success('Member deleted.', { celebrate: false });
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
            <div className="member-photo-row">
              <Avatar size="lg" name={form.name} src={form.photo} />
              <div className="member-photo-actions">
                <label className="btn btn-outline btn-sm">
                  <Camera size={14} /> {uploading ? 'Uploading...' : form.photo ? 'Replace photo' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePhoto}
                    hidden
                    disabled={uploading}
                  />
                </label>
                {form.photo && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm((f) => ({ ...f, photo: '' }))}>
                    <X size={14} /> Remove
                  </button>
                )}
                <small>JPG, PNG, GIF or WebP · max 5 MB</small>
              </div>
            </div>
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

      <div className="admin-table-scroll">
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
              <td>
                <div className="app-adm-cell">
                  <Avatar size="sm" name={m.name} src={m.photo} seed={m.order} />
                  <strong>{m.name}</strong>
                </div>
              </td>
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
      </div>

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
