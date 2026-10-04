import React, { useEffect, useState } from 'react';
import {
  Check, X, Eye, Trash2, Search, Download, Mail, Phone, MapPin,
  CalendarDays, BookOpen, FileText, GraduationCap, RefreshCcw,
  User, Hash, Building2, Paperclip, MonitorPlay,
} from 'lucide-react';
import apiFetch, { getApiOrigin } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import ActionMenu from '../../components/ActionMenu';
import { useToast } from '../../components/Toast';
import Avatar from '../../components/Avatar';

// The badge is tinted very lightly, so it carries the status on its own: the
// label plus a dot reads at a glance without a coloured edge on the row.
const STATUS_META = {
  pending: { label: 'Pending', color: '#b45309', bg: '#fff7ed', dot: '#f59e0b' },
  reviewed: { label: 'Reviewed', color: '#1d4ed8', bg: '#eff6ff', dot: '#3b82f6' },
  accepted: { label: 'Accepted', color: '#15803d', bg: '#ecfdf5', dot: '#22c55e' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' },
};

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
    setLoading(true);
    apiFetch('/applications')
      .then((d) => setApplications(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(err.message || 'Failed to load applications.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApplications(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
      toast.success('Application deleted.', { celebrate: false });
    } catch (err) {
      toast.error(err.message || 'Failed to delete application.');
    }
  };

  const query = q.trim().toLowerCase();
  const filtered = applications.filter(
    (a) =>
      (!filter || filter === 'all' || a.status === filter) &&
      (!query ||
        [
          a.name, a.email, a.phone, a.regNumber, a.levelOfStudy, a.department, a.gender,
          a.campus, a.learningPlace, a.program, a.intakeTitle, a.status, a.certificateName,
          ...(a.preferredCourses || []),
        ]
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

  const exportExcel = async () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export for the current view.');
      return;
    }
    // xlsx is ~800kB of the bundle and is only ever needed on this click,
    // so it is pulled in on demand rather than shipped to every visitor.
    const XLSX = await import('xlsx');
    const rows = filtered.map((a, i) => ({
      '#': i + 1,
      'Full Name': a.name,
      'Email': a.email,
      'Phone': a.phone || '',
      'DTS Reg Number': a.regNumber || '',
      'Gender': a.gender || '',
      'Level of Study': a.levelOfStudy || '',
      'Department': a.department || '',
      'Campus / Location': a.campus || '',
      'Place of Learning': a.learningPlace || '',
      'Intake': a.intakeTitle,
      'Program': a.program || '',
      'Preferred Courses': (a.preferredCourses || []).join('; '),
      'Basic Certificate': a.certificateName || (a.certificate ? 'Uploaded' : ''),
      'Motivation': a.motivation || '',
      'Applied On': fmtDate(a.createdAt),
      'Status': STATUS_META[a.status] ? STATUS_META[a.status].label : a.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Column order must match the header order above.
    ws['!cols'] = [
      { wch: 4 }, { wch: 24 }, { wch: 26 }, { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 28 },
      { wch: 18 }, { wch: 30 }, { wch: 26 }, { wch: 48 }, { wch: 13 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    XLSX.writeFile(wb, `DTS_Applications_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${filtered.length} application${filtered.length === 1 ? '' : 's'} to Excel.`, { silent: true });
  };

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

      <div className="admin-table-scroll">
      <table className="admin-table app-adm-table is-modern">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Intake</th>
            <th>Campus</th>
            <th>Applied</th>
            <th>Status</th>
            <th className="col-actions" aria-label="Actions" />
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
              <tr
                key={app._id}
                className="app-adm-row"
                onClick={() => setSelected(app)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(app); }}
              >
                <td>
                  <div className="app-adm-cell">
                    <Avatar size="sm" name={app.name} />
                    {/* Two lines, not four. The name carries the registration
                        number beside it because that is what an admin scans for,
                        and the email sits underneath. The phone is deliberately
                        absent: it is a second contact detail for the same person
                        and the profile dialog already shows it in full. */}
                    <div className="app-adm-id">
                      <div className="app-adm-name">
                        <strong>{app.name}</strong>
                        {app.regNumber && (
                          <span className="app-adm-reg"><Hash size={10} />{app.regNumber}</span>
                        )}
                      </div>
                      <div className="app-adm-email">{app.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{app.intakeTitle}</td>
                <td style={{ fontSize: '0.85rem' }}>{app.campus || '—'}</td>
                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{fmtDate(app.createdAt)}</td>
                <td>
                  <span className="app-status-badge" style={{ color: meta.color, background: meta.bg }}>
                    <i className="app-status-dot" style={{ background: meta.dot }} />
                    {meta.label}
                  </span>
                </td>
                <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu
                    label={`Actions for ${app.name}`}
                    items={[
                      {
                        label: 'View profile',
                        tone: 'info',
                        icon: <Eye size={14} />,
                        onSelect: () => setSelected(app),
                      },
                      ...(app.status === 'pending'
                        ? [
                            {
                              label: 'Accept',
                              tone: 'ok',
                              icon: <Check size={14} />,
                              onSelect: () => updateStatus(app._id, 'accepted'),
                            },
                            {
                              label: 'Reject',
                              tone: 'no',
                              icon: <X size={14} />,
                              onSelect: () => updateStatus(app._id, 'rejected'),
                            },
                          ]
                        : [
                            {
                              label: 'Move to pending',
                              tone: 'warn',
                              icon: <RefreshCcw size={14} />,
                              onSelect: () => updateStatus(app._id, 'pending'),
                            },
                          ]),
                      {
                        label: 'Delete',
                        tone: 'danger',
                        icon: <Trash2 size={14} />,
                        onSelect: () => setConfirmId(app._id),
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {selected && (
        <div className="dialog-overlay app-detail-overlay" onClick={() => setSelected(null)}>
          <div className="app-detail" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={`app-detail-head status-${selected.status}`}>
              <button className="dialog-close app-detail-close" onClick={() => setSelected(null)} aria-label="Close">
                <X size={18} />
              </button>
              <Avatar size="lg" name={selected.name} />
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
                {/* Only fields the applicant actually filled in. The previous
                    version rendered every field unconditionally, so an
                    application that left five optional ones blank showed a
                    column of em dashes that read like missing data. */}
                <div className="app-detail-grid">
                  {[
                    { icon: <Phone size={15} />, label: 'Phone', value: selected.phone },
                    { icon: <MapPin size={15} />, label: 'Campus', value: selected.campus },
                    { icon: <MonitorPlay size={15} />, label: 'Place of Learning', value: selected.learningPlace },
                    { icon: <GraduationCap size={15} />, label: 'Intake', value: selected.intakeTitle },
                    { icon: <CalendarDays size={15} />, label: 'Applied', value: fmtDateTime(selected.createdAt) },
                    { icon: <Hash size={15} />, label: 'Reg Number', value: selected.regNumber },
                    { icon: <User size={15} />, label: 'Level of Study', value: selected.levelOfStudy },
                    { icon: <Building2 size={15} />, label: 'Department', value: selected.department },
                    { icon: <User size={15} />, label: 'Gender', value: selected.gender },
                  ]
                    .filter((field) => String(field.value || '').trim())
                    .map((field) => (
                      <div key={field.label} className="app-detail-item">
                        {field.icon}
                        <span>{field.label}</span>
                        <b>{field.value}</b>
                      </div>
                    ))}
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
                  <div className="app-detail-label"><FileText size={15} /> Goals After Training</div>
                  <p>{selected.motivation}</p>
                </div>
              )}

              {selected.certificate && (
                <div className="app-detail-block">
                  <div className="app-detail-label"><Paperclip size={15} /> Basic Certificate</div>
                  <div className="app-detail-actions">
                    <a
                      className="btn btn-outline btn-xs"
                      href={`${getApiOrigin()}${selected.certificate}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open certificate
                    </a>
                    {/* Only the Drive-backed copy is streamed by our own API, which
                        is what turns ?download=1 into a save. The older local files
                        are plain static assets, so a download link would just open
                        them in a new tab under a misleading label. */}
                    {selected.certificateFileId && (
                      <a
                        className="btn btn-outline btn-xs"
                        href={`${getApiOrigin()}${selected.certificate}?download=1`}
                      >
                        <Download size={14} /> Download
                      </a>
                    )}
                  </div>
                  {selected.certificateName && (
                    <div className="table-subtext" style={{ marginTop: '0.5rem' }}>{selected.certificateName}</div>
                  )}
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