import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

export default function TestimonialsAdmin() {
  const toast = useToast();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTestimonials = (activePage = 1, { background = false } = {}) => {
    if (!background) setLoading(true);
    apiFetch(`/testimonials/all?page=${activePage}`)
      .then((d) => {
        // Legacy bare-array shape, kept so an older cached server response still renders.
        if (Array.isArray(d)) {
          setTestimonials(d);
          setTotal(d.length);
          setPages(1);
          setPage(1);
          return;
        }
        setTestimonials(Array.isArray(d?.items) ? d.items : []);
        setTotal(d?.total ?? 0);
        setPages(d?.pages ?? 1);
        setPage(d?.page ?? activePage);
      })
      .catch((err) => toast.error(err.message || 'Failed to load testimonials.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTestimonials(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggleApprove = async (id, current) => {
    try {
      await apiFetch(`/testimonials/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ isApproved: !current }),
      });
      setTestimonials((prev) => prev.map((t) => (t._id === id ? { ...t, isApproved: !current } : t)));
      toast.success(!current ? 'Testimonial approved.' : 'Testimonial approval removed.');
    } catch (err) {
      toast.error(err.message || 'Failed to update testimonial.');
    }
  };

  const deleteTestimonial = async (id) => {
    setDeleting(true);
    try {
      await apiFetch(`/testimonials/${id}`, { method: 'DELETE' });
      toast.success('Testimonial deleted.', { celebrate: false });
      // Refetch rather than splice: the count above the table is the server's.
      // Deleting the only row on the last page would otherwise request a page
      // that no longer exists, so step back a page first.
      const targetPage = testimonials.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      await fetchTestimonials(targetPage, { background: true });
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to delete testimonial.');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading testimonials...</div>;

  return (
    <div>
      <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Testimonials ({total})</h2>
      {testimonials.length === 0 ? (
        <p style={{ color: 'var(--text-light)' }}>No testimonials yet.</p>
      ) : (
        <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Content</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {testimonials.map((t) => (
              <tr key={t._id}>
                <td><strong>{t.name}</strong></td>
                <td style={{ fontSize: '0.85rem' }}>{t.role}</td>
                <td style={{ maxWidth: 300 }}>
                  <span style={{ fontSize: '0.85rem' }}>
                    {t.content && t.content.length > 100 ? t.content.substring(0, 100) + '...' : t.content}
                  </span>
                </td>
                <td>{'★'.repeat(t.rating || 5)}</td>
                <td>
                  <span style={{ fontSize: '0.8rem', color: t.isApproved ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                    {t.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button
                      className={`btn btn-sm ${t.isApproved ? 'btn-outline' : 'btn-success'}`}
                      onClick={() => toggleApprove(t._id, t.isApproved)}
                      title={t.isApproved ? 'Unapprove' : 'Approve'}
                    >
                      {t.isApproved ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(t._id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {pages > 1 && (
        <div className="pagination-bar">
          <span className="pagination-count">
            Showing {testimonials.length} of {total} testimonial{total === 1 ? '' : 's'}
          </span>
          <div className="pagination-controls">
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => fetchTestimonials(page - 1)}>Previous</button>
            <span className="pagination-page">Page {page} of {pages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => fetchTestimonials(page + 1)}>Next</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this testimonial?"
        message="This will permanently remove the testimonial from the site."
        loading={deleting}
        onConfirm={async () => { if (await deleteTestimonial(confirmId)) setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
