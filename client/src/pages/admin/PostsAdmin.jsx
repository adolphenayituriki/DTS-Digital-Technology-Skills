import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';

const emptyForm = { title: '', content: '', excerpt: '', category: '', published: true };

export default function PostsAdmin() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const fetchPosts = () => {
    apiFetch('/posts')
      .then((d) => setPosts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        await apiFetch(`/posts/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/posts', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      fetchPosts();
    } catch (err) {
      setError(err.message || 'Failed to save post.');
    }
  };

  const startEdit = (p) => {
    setForm({ title: p.title, content: p.content || '', excerpt: p.excerpt || '', category: p.category || '', published: p.published !== false });
    setEditId(p._id);
    setShowForm(true);
  };

  const deletePost = async (id) => {
    try {
      await apiFetch(`/posts/${id}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading posts...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700 }}>Posts ({posts.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}>
          <Plus size={16} /> Add Post
        </button>
      </div>

      {showForm && (
        <div className="card mb-3">
          <h3 style={{ marginBottom: '1rem' }}>{editId ? 'Edit Post' : 'Add New Post'}</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Title *</label>
                <input name="title" className="form-control" value={form.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input name="category" className="form-control" value={form.category} onChange={handleChange} placeholder="e.g. Training, Event, Announcement" />
              </div>
            </div>
            <div className="form-group">
              <label>Excerpt</label>
              <textarea name="excerpt" className="form-control" rows={2} value={form.excerpt} onChange={handleChange} placeholder="Brief summary of the post" />
            </div>
            <div className="form-group">
              <label>Content *</label>
              <textarea name="content" className="form-control" rows={8} value={form.content} onChange={handleChange} required placeholder="Full article content (HTML supported)" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" name="published" checked={form.published} onChange={handleChange} id="published" />
              <label htmlFor="published" style={{ marginBottom: 0 }}>Published</label>
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
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p._id}>
              <td><strong>{p.title}</strong></td>
              <td>
                {p.category && <span className="badge">{p.category}</span>}
              </td>
              <td>
                <span style={{ fontSize: '0.8rem', color: p.published !== false ? 'var(--success)' : 'var(--text-light)', fontWeight: 600 }}>
                  {p.published !== false ? 'Published' : 'Draft'}
                </span>
              </td>
              <td style={{ fontSize: '0.85rem' }}>
                {new Date(p.createdAt).toLocaleDateString()}
              </td>
              <td>
                <div className="actions">
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}><Edit size={14} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(p._id)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this post?"
        message="This will permanently remove the post and its details from the site."
        onConfirm={async () => { await deletePost(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
