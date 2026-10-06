import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, ImagePlus, X } from 'lucide-react';
import apiFetch, { API_URL, TOKEN_KEY, getApiOrigin } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const emptyForm = { title: '', content: '', excerpt: '', category: '', isPublished: true, featuredImage: '' };

export default function PostsAdmin() {
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const fetchPosts = (activePage = page) => {
    setLoading(true);
    apiFetch(`/posts/all?page=${activePage}`)
      .then((d) => {
        // Tolerates a bare array so an un-deployed server still populates the
        // table rather than showing a permanent empty state.
        if (Array.isArray(d)) {
          setPosts(d);
          setTotal(d.length);
          setPages(1);
          return;
        }
        setPosts(Array.isArray(d?.items) ? d.items : []);
        setTotal(d?.total ?? 0);
        setPages(d?.pages ?? 1);
        setPage(d?.page ?? activePage);
      })
      .catch((err) => toast.error(err.message || 'Failed to load posts.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        let msg = `Upload failed (${res.status})`;
        try {
          const parsed = JSON.parse(await res.text());
          if (parsed?.message) msg = parsed.message;
        } catch { /* keep default */ }
        throw new Error(msg);
      }
      const data = await res.json();
      setForm((f) => ({ ...f, featuredImage: getApiOrigin() + data.url }));
      toast.success('Image uploaded.');
    } catch (err) {
      setError(err.message || 'Image upload failed.');
      toast.error(err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Sorted newest-first, so a brand new post lands on page 1. Refreshing
      // whatever page is open would leave the operator staring at a page that
      // does not contain the row they just created.
      const isCreate = !editId;
      if (editId) {
        await apiFetch(`/posts/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/posts', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      if (isCreate) setPage(1);
      fetchPosts(isCreate ? 1 : page);
      toast.success(editId ? 'Post updated.' : 'Post created.');
    } catch (err) {
      setError(err.message || 'Failed to save post.');
      toast.error(err.message || 'Failed to save post.');
    }
  };

  const startEdit = (p) => {
    setForm({ title: p.title, content: p.content || '', excerpt: p.excerpt || '', category: p.category || '', isPublished: p.isPublished !== false, featuredImage: p.featuredImage || '' });
    setEditId(p._id);
    setShowForm(true);
  };

  const deletePost = async (id) => {
    setDeleting(true);
    try {
      await apiFetch(`/posts/${id}`, { method: 'DELETE' });
      toast.success('Post deleted.', { celebrate: false });
      // Refetch instead of splicing the row out: the count above the table comes
      // from the server, so an in-memory removal would leave it off by one.
      //
      // Deleting the only row on the last page would otherwise request a page
      // that no longer exists and show an empty table next to "Page 3 of 2", so
      // step back a page first when this one has just emptied.
      const targetPage = posts.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      await fetchPosts(targetPage);
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to delete post.');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading posts...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        {/* total, not posts.length - the latter is one page's worth once the list paginates. */}
        <h2 style={{ fontWeight: 700 }}>Posts ({total})</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}>
          <Plus size={16} /> Add Post
        </button>
      </div>

      {showForm && (
        <div className="card mb-3">
          <h3 style={{ marginBottom: '1rem' }}>{editId ? 'Edit Post' : 'Add New Post'}</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Featured Image</label>
              <div className="img-upload">
                {form.featuredImage ? (
                  <div className="img-upload-preview">
                    <img src={form.featuredImage} alt="Featured image preview" />
                    <div className="img-upload-actions">
                      <label className="btn btn-outline btn-sm">
                        <ImagePlus size={14} /> Replace
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleUpload} hidden />
                      </label>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm((f) => ({ ...f, featuredImage: '' }))}>
                        <X size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="img-upload-empty">
                    <ImagePlus size={22} />
                    <span>{uploading ? 'Uploading...' : 'Click to upload an image'}</span>
                    <small>JPG, PNG, GIF or WebP · max 5 MB</small>
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleUpload} hidden />
                  </label>
                )}
              </div>
            </div>
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
               <input type="checkbox" name="isPublished" checked={form.isPublished} onChange={handleChange} id="isPublished" />
               <label htmlFor="isPublished" style={{ marginBottom: 0 }}>Published</label>
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
                <span style={{ fontSize: '0.8rem', color: p.isPublished !== false ? 'var(--success)' : 'var(--text-light)', fontWeight: 600 }}>
                  {p.isPublished !== false ? 'Published' : 'Draft'}
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
      </div>

      {pages > 1 && (
        <div className="pagination-bar">
          <span className="pagination-count">
            Showing {posts.length} of {total} post{total === 1 ? '' : 's'}
          </span>
          <div className="pagination-controls">
            <button className="btn btn-outline btn-sm" disabled={loading || page <= 1} onClick={() => fetchPosts(page - 1)}>Previous</button>
            <span className="pagination-page">Page {page} of {pages}</span>
            <button className="btn btn-outline btn-sm" disabled={loading || page >= pages} onClick={() => fetchPosts(page + 1)}>Next</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this post?"
        message="This will permanently remove the post and its details from the site."
        loading={deleting}
        onConfirm={async () => { if (await deletePost(confirmId)) setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
