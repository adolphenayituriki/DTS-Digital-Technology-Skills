import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Check, X, Eye, Trash2, Search, Download, Mail, Phone, MapPin,
  CalendarDays, BookOpen, FileText, GraduationCap, RefreshCcw,
} from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const STATUS_META = {
  pending: { label: 'Pending', color: 'var(--text-light)', bg: '#f1f5f9' },
  reviewed: { label: 'Reviewed', color: 'var(--primary)', bg: '#e8f6fd' },
  accepted: { label: 'Accepted', color: 'var(--success)', bg: '#f0fdf4' },
  rejected: { label: 'Rejected', color: 'var(--error)', bg: '#fef2f2' },
};

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ApplicationsAdmin() {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const fetchApplications = () => {
    apiFetch('/applications')
      .then((d) => setApplications(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApplications(); }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const updateStatus = async (id, status) => {
    try {
      const updated = await apiFetch(`/applications/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      setApplications((prev) => prev.map((a) => (a._id === id ? updated : a)));
      if (selected?._id === id) setSelected({ ...selected, ...updated });
      toast.success(`Application ${status}.`);
    } catch (err) {
      toast.error(err.message || 'Failed to update application.');
    }
  };

  const deleteApplication = async (id) => {
    try {
      await apiFetch(`/applications/${id}`, { method: 'DELETE' });
      setApplications((prev) => prev.filter((a) => a._id !== id));
      setSelected(null);
      toast.success('Application deleted.');
    } catch (err) {
      toast.error(err.message || 'Failed to delete application.');
    }
  };

  const query = q.trim().toLowerCase();
  const filtered = applications.filter(
    (a) =>
      (!filter || filter === 'all' || a.status === filter) &&
      (!query ||
        [a.name, a.email, a.phone, a.campus, a.program, a.intakeTitle, a.status, ...(a.preferredCourses || [])]
          .filter(Boolean)
          .some((v) => v.toString().toLowerCase().includes(query))),
  );

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    reviewed: applications.filter((a) => a.status === 'reviewed').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export for the current view.');
      return;
    }
    const rows = filtered.map((a, i) => ({
      '#': i + 1,
      'Full Name': a.name,
      'Email': a.email,
      'Phone': a.phone || '',
      'Campus / Location': a.campus || '',
      'Intake': a.intakeTitle,
      'Program': a.program || '',
      'Preferred Courses': (a.preferredCourses || []).join('; '),
      'Motivation': a.motivation || '',
      'Applied On': fmtDate(a.createdAt),
      'Status': STATUS_META[a.status] ? STATUS_META[a.status].label : a.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 4 }, { wch: 24 }, { wch: 26 }, { wch: 16 }, { wch: 16 },
      { wch: 28 }, { wch: 18 }, { wch: 30 }, { wch: 48 }, { wch: 13 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    XLSX.writeFile(wb, `DTS_Applications_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${filtered.length} application${filtered.length === 1 ? '' : 's'} to Excel.`);
  };

  const renderDetailValue = (value) => (value === null || value === undefined || value === '' ? '—' : value);

  if (loading) return <div className="loading"><div className="spinner" />Loading applications...</div>;

  return (
    <div>
      <div className="app-adm-head">
        <div>
          <h2 style={{ fontWeight: 700 }}>Applications ({applications.length})</h2>
          <p className="app-adm-sub">Click any applicant to review their full profile and take action.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={exportExcel} title="Export to Excel">
          <Download size={15} /> Export Excel
        </button>
      </div>

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

      <div className="list-toolbar" style={{ marginTop: '-1rem' }}>
        <div className="search-box" style={{ width: 'min(320px, 100%)' }}>
          <Search size={15} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search applicants..."
            aria-label="Search applicants"
          />
        </div>
      </div>

      <table className="admin-table app-adm-table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Intake</th>
            <th>Campus</th>
            <th>Applied</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2.5rem' }}>
              No applications found for this view.
            </td></tr>
          )}
          {filtered.map((app) => {
            const meta = STATUS_META[app.status] || STATUS_META.pending;
            return (
              <tr key={app._id} className="app-adm-row" onClick={() => setSelected(app)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(app); }}>
                <td>
                  <div className="app-adm-cell">
                    <span className="app-adm-avatar">{initials(app.name)}</span>
                    <div>
                      <strong>{app.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{app.email}</div>
                      {app.phone && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <Phone size={11} /> {app.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{app.intakeTitle}</td>
                <td style={{ fontSize: '0.85rem' }}>{app.campus || '—'}</td>
                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{fmtDate(app.createdAt)}</td>
                <td>
                  <span className="app-status-badge" style={{ color: meta.color, background: meta.bg }}>
                    {meta.label}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setSelected(app)} title="View details">
                      <Eye size={14} />
                    </button>
                    {app.status === 'pending' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(app._id, 'accepted')} title="Accept">
                          <Check size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateStatus(app._id, 'rejected')} title="Reject">
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {app.status !== 'pending' && (
                      <button className="btn btn-outline btn-sm" onClick={() => updateStatus(app._id, 'pending')} title="Reset to pending">
                        <RefreshCcw size={14} />
                      </button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(app._id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected && (
        <div className="dialog-overlay app-detail-overlay" onClick={() => setSelected(null)}>
          <div className="app-detail" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={`app-detail-head status-${selected.status}`}>
              <button className="dialog-close app-detail-close" onClick={() => setSelected(null)} aria-label="Close">
                <X size={18} />
              </button>
              <span className="app-detail-avatar">{initials(selected.name)}</span>
              <h3>{selected.name}</h3>
              <a className="app-detail-mail" href={`mailto:${selected.email}`}>
                <Mail size={13} /> {selected.email}
              </a>
              <span className="app-status-badge" style={{
                color: (STATUS_META[selected.status] || STATUS_META.pending).color,
                background: (STATUS_META[selected.status] || STATUS_META.pending).bg,
              }}>
                {(STATUS_META[selected.status] || STATUS_META.pending).label}
              </span>
            </div>

            <div className="app-detail-body">
              <div className="app-detail-grid">
                <div className="app-detail-item">
                  <CalendarDays size={15} /><span>Phone</span><b>{renderDetailValue(selected.phone)}</b>
                </div>
                <div className="app-detail-item">
                  <MapPin size={15} /><span>Campus</span><b>{renderDetailValue(selected.campus)}</b>
                </div>
                <div className="app-detail-item">
                  <GraduationCap size={15} /><span>Intake</span><b>{selected.intakeTitle}</b>
                </div>
                <div className="app-detail-item">
                  <CalendarDays size={15} /><span>Applied</span><b>{fmtDateTime(selected.createdAt)}</b>
                </div>
              </div>

              <div className="app-detail-block">
                <div className="app-detail-label"><BookOpen size={15} /> Program & Preferred Courses</div>
                {Array.isArray(selected.preferredCourses) && selected.preferredCourses.length > 0 ? (
                  <div className="app-detail-courses">
                    {selected.preferredCourses.map((c) => (
                      <span key={c} className="intake-course-chip">{c}</span>
                    ))}
                  </div>
                ) : (
                  <p>{selected.program || '—'}</p>
                )}
              </div>

              {selected.motivation && (
                <div className="app-detail-block">
                  <div className="app-detail-label"><FileText size={15} /> Motivation</div>
                  <p>{selected.motivation}</p>
                </div>
              )}

              <div className="app-detail-actions">
                {selected.status === 'pending' && (
                  <button className="btn btn-outline btn-sm" onClick={() => updateStatus(selected._id, 'reviewed')}>
                    Mark Reviewed
                  </button>
                )}
                <button
                  className={`btn btn-sm ${selected.status === 'accepted' ? 'btn-outline' : 'btn-success'}`}
                  onClick={() => updateStatus(selected._id, 'accepted')}
                >
                  <Check size={14} /> {selected.status === 'accepted' ? 'Accepted' : 'Accept'}
                </button>
                <button
                  className={`btn btn-sm ${selected.status === 'rejected' ? 'btn-outline' : 'btn-danger'}`}
                  onClick={() => updateStatus(selected._id, 'rejected')}
                >
                  <X size={14} /> {selected.status === 'rejected' ? 'Rejected' : 'Reject'}
                </button>
                {selected.status !== 'pending' && (
                  <button className="btn btn-outline btn-sm" onClick={() => updateStatus(selected._id, 'pending')}>
                    <RefreshCcw size={14} /> Reset to Pending
                  </button>
                )}
                <button className="btn btn-outline btn-sm app-detail-del" onClick={() => setConfirmId(selected._id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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