import React, { useEffect, useState } from 'react';
import { Check, X, Eye, Trash2 } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ApplicationsAdmin() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [confirmId, setConfirmId] = useState(null);

  const fetchApplications = () => {
    apiFetch('/applications')
      .then((d) => setApplications(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApplications(); }, []);

  const updateStatus = async (id, status) => {
    try {
      const updated = await apiFetch(`/applications/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      setApplications((prev) => prev.map((a) => (a._id === id ? updated : a)));
    } catch { /* ignore */ }
  };

  const deleteApplication = async (id) => {
    try {
      await apiFetch(`/applications/${id}`, { method: 'DELETE' });
      setApplications((prev) => prev.filter((a) => a._id !== id));
    } catch { /* ignore */ }
  };

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);
  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    reviewed: applications.filter((a) => a.status === 'reviewed').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading applications...</div>;

  return (
    <div>
      <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Applications ({applications.length})</h2>

      <div className="admin-filter-tabs">
        {['all', 'pending', 'reviewed', 'accepted', 'rejected'].map((f) => (
          <button
            key={f}
            className={`admin-filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Intake</th>
            <th>Campus</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>No applications found</td></tr>
          )}
          {filtered.map((app) => (
            <tr key={app._id}>
              <td>
                <strong>{app.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{app.email}</div>
              </td>
              <td style={{ fontSize: '0.85rem' }}>{app.intakeTitle}</td>
              <td style={{ fontSize: '0.85rem' }}>{app.campus || '—'}</td>
              <td style={{ fontSize: '0.85rem' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
              <td>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
                  color: app.status === 'accepted' ? 'var(--success)' : app.status === 'rejected' ? 'var(--error)' : app.status === 'reviewed' ? 'var(--primary)' : 'var(--text-light)',
                }}>
                  {app.status}
                </span>
              </td>
              <td>
                <div className="actions">
                  {app.status === 'pending' && (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => updateStatus(app._id, 'accepted')} title="Accept"><Check size={14} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => updateStatus(app._id, 'rejected')} title="Reject"><X size={14} /></button>
                    </>
                  )}
                  {app.status !== 'pending' && (
                    <button className="btn btn-outline btn-sm" onClick={() => updateStatus(app._id, 'pending')} title="Reset to pending"><Eye size={14} /></button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(app._id)} title="Delete"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete application?"
        message="This will permanently remove the application and decrease the intake's enrolled count."
        onConfirm={async () => { await deleteApplication(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}