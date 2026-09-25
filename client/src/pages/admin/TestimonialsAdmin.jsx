import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function TestimonialsAdmin() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const fetchTestimonials = () => {
    apiFetch('/testimonials/all')
      .then((d) => setTestimonials(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTestimonials(); }, []);

  const toggleApprove = async (id, current) => {
    try {
      await apiFetch(`/testimonials/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ isApproved: !current }),
      });
      setTestimonials((prev) => prev.map((t) => (t._id === id ? { ...t, isApproved: !current } : t)));
    } catch { /* ignore */ }
  };

  const deleteTestimonial = async (id) => {
    try {
      await apiFetch(`/testimonials/${id}`, { method: 'DELETE' });
      setTestimonials((prev) => prev.filter((t) => t._id !== id));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading testimonials...</div>;

  return (
    <div>
      <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Testimonials ({testimonials.length})</h2>
      {testimonials.length === 0 ? (
        <p style={{ color: 'var(--text-light)' }}>No testimonials yet.</p>
      ) : (
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
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this testimonial?"
        message="This will permanently remove the testimonial from the site."
        onConfirm={async () => { await deleteTestimonial(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
