import React, { useEffect, useRef, useState } from 'react';
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
import Loading, { TableLoading } from '../../components/Loading';
import useDebounced from '../../hooks/useDebounced';

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

// Shown before the first response arrives, and kept as the fallback shape so the
// tab labels always have five numbers to render.
const EMPTY_COUNTS = { all: 0, pending: 0, reviewed: 0, accepted: 0, rejected: 0 };

const PAGE_SIZE = 50;

export default function ApplicationsAdmin() {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  // A refetch triggered by changing the status tab or typing in search must not
  // blank the page: the toolbar would disappear under a spinner on every
  // keystroke and take the search box with it, cancelling the user's own input.
  // `refreshing` only reshapes the table body.
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  // The input stays bound to `q` so typing is instant; `searchTerm` is what
  // reaches the request. Keeping one value for both would put a request on the
  // path for every keystroke.
  const searchTerm = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef(null);

  // Server-side filter, search and paging, all in one request. The counts in the
  // status tabs come back with it rather than being derived here - deriving them
  // meant walking the full collection in the browser, which is exactly what
  // paging the collection is meant to stop.
  const buildQuery = (activePage, { all = false } = {}) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (all) params.set('all', 'true');
    else params.set('page', String(activePage));
    if (filter && filter !== 'all') params.set('status', filter);
    const term = searchTerm.trim();
    if (term) params.set('q', term);
    return params.toString();
  };

  const fetchApplications = (activePage = 1, { background = false } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    // Cancel the request being superseded, so a slow response cannot land after
    // a faster one and put the wrong page back on screen.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    apiFetch(`/applications?${buildQuery(activePage)}`, { signal: controller.signal })
      .then((d) => {
        // Legacy bare-array shape, kept only so an older cached server response
        // still renders instead of throwing on `d.items`.
        if (Array.isArray(d)) {
          setApplications(d);
          setTotal(d.length);
          setPages(1);
          setPage(1);
          return;
        }
        setApplications(Array.isArray(d?.items) ? d.items : []);
        setTotal(Number.isFinite(d?.total) ? d.total : 0);
        setPages(Number.isFinite(d?.pages) ? d.pages : 1);
        setPage(Number.isFinite(d?.page) ? d.page : activePage);
        if (d?.counts) setCounts({ ...EMPTY_COUNTS, ...d.counts });
      })
      .catch((err) => {
        // A superseded request is not a failure - aborts are rethrown by api.js
        // precisely so they can be told apart from real errors here.
        if (err?.name === 'AbortError') return;
        toast.error(err.message || 'Failed to load applications.');
      })
      .finally(() => {
        // Only the request that is still current clears the indicator. A
        // superseded or unmounted request must not, or it would switch the
        // skeleton off while the newer request was still in flight.
        if (controller.signal.aborted || abortRef.current !== controller) return;
        setLoading(false);
        setRefreshing(false);
      });
  };

  // Re-runs when the tab or the (debounced) search term changes, so both return
  // to page 1 - staying on page 4 of a different result set shows a wrong-looking
  // list or an out-of-range empty page.
  //
  // `loading` decides which of the two in-flight states this is: on the very
  // first run it is still true, so the page shows its centred spinner; by the
  // time a tab or search changes it is false, so only the table body reshapes.
  useEffect(() => {
    fetchApplications(1, { background: !loading });
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchTerm]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const updateStatus = async (id, status) => {
    try {
      const updated = await apiFetch(`/applications/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      // Patched in place first so the badge flips without waiting, then the
      // view is refreshed: the tab counts changed, and if the active status tab
      // no longer matches this row it has to leave the table.
      setApplications((prev) => prev.map((a) => (a._id === id ? updated : a)));
      if (selected?._id === id) setSelected({ ...selected, ...updated });
      toast.success(`Application ${status}.`);
      fetchApplications(page, { background: true });
    } catch (err) {
      toast.error(err.message || 'Failed to update application.');
    }
  };

  const deleteApplication = async (id) => {
    setDeleting(true);
    try {
      await apiFetch(`/applications/${id}`, { method: 'DELETE' });
      setSelected(null);
      toast.success('Application deleted.', { celebrate: false });
      // The table is refetched rather than spliced, because the tab counts and
      // the page total all live server-side now. Deleting the only row on the
      // last page would otherwise request a page that no longer exists and show
      // an empty table beside "Page 3 of 2", so step back a page first.
      const targetPage = applications.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      await fetchApplications(targetPage, { background: true });
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to delete application.');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      // Export asks the server for every row matching the current tab and search
      // rather than the page on screen - exporting a filtered view of 340 rows
      // as the 50 that happen to be visible would be a silent data loss.
      const params = new URLSearchParams({ all: 'true' });
      if (filter && filter !== 'all') params.set('status', filter);
      const term = searchTerm.trim();
      if (term) params.set('q', term);

      const response = await apiFetch(`/applications?${params.toString()}`);
      const matches = Array.isArray(response) ? response : response?.items || [];

      if (matches.length === 0) {
        toast.error('Nothing to export for the current view.');
        return;
      }
      // xlsx is ~800kB of the bundle and is only ever needed on this click,
      // so it is pulled in on demand rather than shipped to every visitor.
      const XLSX = await import('xlsx');
      const rows = matches.map((a, i) => ({
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
      toast.success(`Exported ${matches.length} application${matches.length === 1 ? '' : 's'} to Excel.`, { silent: true });
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error(err.message || 'Failed to export applications.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Loading label="Loading applications..." />;

  return (
    <div>
      <div className="app-adm-head">
        <div>
          {/* total from the server, not applications.length - the latter is one
              page's worth once the list paginates. */}
          <h2 style={{ fontWeight: 700 }}>Applications ({total})</h2>
          <p className="app-adm-sub">Click any applicant to review their full profile and take action.</p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={exportExcel}
          disabled={exporting || refreshing}
          title="Export to Excel"
        >
          <Download size={15} /> {exporting ? 'Exporting…' : 'Export Excel'}
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
      <table className="admin-table app-adm-table is-modern" aria-busy={refreshing}>
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
          {/* Shaped rows instead of the previous centred spinner: collapsing the
              table to a spinner while a tab or search refetches throws away the
              layout, and an empty table with no error reads as "nothing here". */}
          {refreshing ? (
            <TableLoading rows={6} cols={6} label="Loading applications..." />
          ) : applications.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2.5rem' }}>
              No applications found for this view.
            </td></tr>
          ) : applications.map((app) => {
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

      {pages > 1 && (
        <div className="pagination-bar">
          <span className="pagination-count">
            Showing {applications.length} of {total} application{total === 1 ? '' : 's'}
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-outline btn-sm"
              disabled={loading || refreshing || page <= 1}
              onClick={() => fetchApplications(page - 1, { background: true })}
            >
              Previous
            </button>
            <span className="pagination-page">Page {page} of {pages}</span>
            <button
              className="btn btn-outline btn-sm"
              disabled={loading || refreshing || page >= pages}
              onClick={() => fetchApplications(page + 1, { background: true })}
            >
              Next
            </button>
          </div>
        </div>
      )}

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
                  {/\.(png|jpe?g|webp|gif)$/i.test(selected.certificate) ? (
                    <a
                      className="app-cert-preview"
                      href={`${getApiOrigin()}${selected.certificate}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={selected.certificateName || 'Open certificate in a new tab'}
                    >
                      <img
                        src={`${getApiOrigin()}${selected.certificate}`}
                        alt={selected.certificateName || 'Basic certificate'}
                        loading="lazy"
                      />
                    </a>
                  ) : (
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
                  )}
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
        loading={deleting}
        onConfirm={async () => { if (await deleteApplication(confirmId)) setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}