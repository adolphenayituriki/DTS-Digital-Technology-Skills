import React, { useEffect, useRef, useState } from 'react';
import { Search, Wallet, Mail, FileText, X, Save } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiFetch, { onFinanceRefresh, triggerFinanceRefresh } from '../api';
import { useToast } from '../components/Toast';
import { TableLoading } from '../components/Loading';
import useDebounced from '../hooks/useDebounced';

const money = (value) => `${Number(value || 0).toLocaleString('en-RW')} RWF`;
const statusMeta = {
  paid: { label: 'Paid', className: 'status-paid' },
  partial: { label: 'Partial', className: 'status-partial' },
  unpaid: { label: 'Unpaid', className: 'status-unpaid' },
  not_configured: { label: 'No fee set', className: 'status-neutral' },
};

export default function FinanceStudentBalances() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [intakes, setIntakes] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ intakeId: '', status: '', q: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Per-student and bulk email sends, so the button that was pressed is the one
  // that reports the wait and the one that cannot be pressed twice.
  const [emailingId, setEmailingId] = useState(null);
  const [bulkEmailing, setBulkEmailing] = useState(false);

  // Each request behind this filter is the most expensive read in the app: every
  // student, every one of their transactions, every intake title, plus a regex
  // scan. Binding the search box straight to the fetch effect meant one full
  // rollup per keystroke.
  const searchQuery = useDebounced(filters.q, 300);

  // Check if we came from a student selection (pre-fill for payment).
  // Must run in an effect, not during render, or it loops.
  const prefillStudentId = searchParams.get('studentId');
  const prefillHandled = useRef(false);
  // Holds the in-flight list request so it can be aborted when the filter changes.
  const loadController = useRef(null);
  useEffect(() => () => loadController.current?.abort(), []);
  useEffect(() => {
    if (!prefillStudentId || prefillHandled.current) return;
    prefillHandled.current = true;
    navigate('/finance/records', { replace: true, state: { prefillStudentId } });
  }, [prefillStudentId, navigate]);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(50);
  const [exporting, setExporting] = useState(false);

  const loadData = (active = filters, activePage = page) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    Object.entries(active).forEach(([key, value]) => { if (value) params.set(key, value); });
    params.set('page', String(activePage));
    params.set('limit', String(limit));
    // The in-flight request is abandoned when a newer one starts, so a slow
    // response cannot overwrite the rows for the filter the user is now on.
    const controller = new AbortController();
    loadController.current?.abort();
    loadController.current = controller;
    apiFetch(`/finance/students?${params.toString()}`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        // The endpoint returns a paged envelope. Tolerating a bare array too
        // keeps this working against an older server that has not been deployed
        // yet, rather than rendering an empty table with no explanation.
        if (Array.isArray(data)) {
          setStudents(data);
          setTotal(data.length);
          setPages(1);
          return;
        }
        setStudents(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? 1);
        setPages(data?.pages ?? 1);
      })
      .catch((requestError) => {
        if (controller.signal.aborted || requestError?.name === 'AbortError') return;
        setStudents([]);
        setTotal(0);
        setError(requestError.message || 'Failed to load student balances.');
        toast.error(requestError.message || 'Failed to load student balances.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  };

  useEffect(() => {
    apiFetch('/finance/intakes')
      .then((data) => setIntakes(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(error.message || 'Failed to load intakes.'));
  }, [toast]);

  // Keyed on the individual filter values rather than the object, so unrelated
  // re-renders do not refetch, and on the debounced search rather than the raw
  // input. loadData is read through a ref because onFinanceRefresh registers it
  // once and must not re-subscribe on every keystroke.
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;
  // Any filter change restarts at page 1. Without this, narrowing a filter while
  // sitting on page 4 asks for a page that no longer exists and shows an empty
  // table next to a full page count.
  useEffect(() => {
    setPage(1);
  }, [filters.intakeId, filters.status, searchQuery]);
  useEffect(() => {
    loadDataRef.current(filters, page);
    return onFinanceRefresh(() => loadDataRef.current(filters, page));
  }, [filters.intakeId, filters.status, searchQuery, page]);

  const handleRowClick = (student) => {
    navigate('/finance/records', { state: { prefillStudentId: student._id } });
  };

  const openPaymentModal = (student) => {
    if (!student.intakeId) {
      toast.error('This student has no intake assigned. Cannot record payment.');
      return;
    }
    setPaymentModal({
      student,
      amount: student.balance > 0 ? Number(student.balance).toFixed(2) : '',
      method: 'cash',
      reference: '',
      notes: '',
    });
  };

  const closePaymentModal = () => setPaymentModal(null);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModal) return;
    const amount = Number(paymentModal.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/finance/transactions', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'payment',
          amount,
          studentId: paymentModal.student._id,
          intakeId: paymentModal.student.intakeId,
          category: 'Training fee',
          method: paymentModal.method,
          status: 'completed',
          occurredAt: new Date().toISOString().slice(0, 10),
          reference: paymentModal.reference,
          notes: paymentModal.notes,
        }),
      });
      toast.success(`Payment of ${money(amount)} recorded for ${paymentModal.student.name}.`, { grand: true });
      closePaymentModal();
      triggerFinanceRefresh();
    } catch (error) {
      toast.error(error.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendBalanceEmail = async (student) => {
    // Each send is a synchronous SMTP round trip held open by the request. Without
    // a per-row flag the button stayed live and a double click queued a second
    // identical email.
    if (emailingId) return;
    setEmailingId(student._id);
    try {
      await apiFetch(`/finance/students/${student._id}/send-balance`, { method: 'POST' });
      toast.success(`Balance statement sent to ${student.email}`);
    } catch (error) {
      toast.error(error.message || 'Failed to send email.');
    } finally {
      setEmailingId(null);
    }
  };

  const sendBulkBalanceEmails = async () => {
    if (bulkEmailing) return;
    setBulkEmailing(true);
    try {
      const params = new URLSearchParams();
      // Uses the debounced search, so the emails go to the rows actually on screen
      // rather than to whatever half-typed name was in the box a moment ago.
      Object.entries({ ...filters, q: searchQuery }).forEach(([key, value]) => { if (value) params.set(key, value); });
      const res = await apiFetch('/finance/students/send-balance-bulk', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(params)),
      });
      toast.success(res.message);
    } catch (error) {
      toast.error(error.message || 'Failed to send bulk emails.');
    } finally {
      setBulkEmailing(false);
    }
  };

  // Built from a full fetch rather than from `students`, because that array is now
// one page. Exporting it as-is would silently produce a file containing only the
// rows the operator happened to be looking at, which is the kind of mistake that
// gets noticed when the numbers do not add up.
const toCsv = (rows) => {
    const headers = ['Student', 'Registration Number', 'Email', 'Intake / Level', 'Program', 'Required', 'Paid', 'Balance', 'Status'];
    const lines = rows.map((s) => {
      const meta = statusMeta[s.paymentStatus] || statusMeta.not_configured;
      return [
        s.name,
        s.regNumber,
        s.email,
        s.intakeTitle,
        s.intakeProgram,
        Number(s.expected || 0).toFixed(2),
        Number(s.paid || 0).toFixed(2),
        Number(s.balance || 0).toFixed(2),
        meta.label,
      ];
    });
    return [headers.join(','), ...lines.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
  };

  const exportCSV = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      Object.entries({ ...filters, q: searchQuery }).forEach(([key, value]) => { if (value) params.set(key, value); });
      // all=true asks for the whole filtered set, not the page on screen.
      params.set('all', 'true');
      const data = await apiFetch(`/finance/students?${params.toString()}`);
      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) {
        toast.error('There is nothing to export.');
        return;
      }
      const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-balances-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} students.`);
    } catch (error) {
      toast.error(error.message || 'Failed to export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div><h2>Student Balances</h2><p>Track required fees and payments by student, level, or intake.</p></div>
        <div className="workspace-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Wallet size={24} className="workspace-header-icon" />
          <button className="btn btn-outline btn-sm" disabled={exporting || loading || total === 0} onClick={exportCSV} title={exporting ? 'Preparing...' : `Export all ${total} matching students`}>{exporting ? <span className="btn-spinner" aria-hidden="true" /> : <FileText size={14} />} {exporting ? 'Exporting...' : 'Export CSV'}</button>
          <button className="btn btn-outline btn-sm" disabled={bulkEmailing || loading || total === 0} onClick={sendBulkBalanceEmails} title={bulkEmailing ? 'Sending...' : `Email every student matching the current filter (${total})`}>{bulkEmailing ? <span className="btn-spinner" aria-hidden="true" /> : <Mail size={14} />} {bulkEmailing ? 'Sending...' : 'Email All Filtered'}</button>
        </div>
      </div>
      <div className="app-adm-toolbar">
        <select className="form-control workspace-filter" value={filters.intakeId} onChange={(e) => setFilters((current) => ({ ...current, intakeId: e.target.value }))}><option value="">All intakes / levels</option>{intakes.map((intake) => <option key={intake._id} value={intake._id}>{intake.title}</option>)}</select>
        <select className="form-control workspace-filter" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}><option value="">All statuses</option><option value="active">Active</option><option value="applicant">Applicant</option><option value="rejected">Rejected</option></select>
        <div className="search-box workspace-search"><Search size={15} /><input type="search" value={filters.q} onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))} placeholder="Search name, reg #, email..." /></div>
      </div>
      {loading && students.length === 0 ? <div className="loading"><div className="spinner" />Loading balances...</div> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Student</th><th>Intake / level</th><th>Required</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {loading && <TableLoading rows={8} cols={7} label="Loading balances" />}
        {!loading && error && <tr><td colSpan={7} className="table-empty table-empty-error">{error}</td></tr>}
        {!loading && !error && students.length === 0 && <tr><td colSpan={7} className="table-empty">No student balances found.</td></tr>}
        {!loading && !error && students.length > 0 && total > students.length && <tr><td colSpan={7} className="table-subtext">Showing {students.length} of {total}. Narrow the search, or use the page controls below to see the rest.</td></tr>}
        {students.map((student) => { const meta = statusMeta[student.paymentStatus] || statusMeta.not_configured; const busy = emailingId === student._id; return <tr key={student._id} style={{ cursor: 'pointer' }}><td><strong>{student.name}</strong><small className="table-subtext">{student.regNumber} · {student.email}</small></td><td>{student.intakeTitle}<small className="table-subtext">{student.intakeProgram}</small></td><td>{money(student.expected)}</td><td>{money(student.paid)}</td><td className={student.balance > 0 ? 'text-danger' : 'text-success'}>{money(student.balance)}</td><td><span className={`finance-status ${meta.className}`}>{meta.label}</span></td><td><div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}><button className="btn btn-outline btn-xs" disabled={Boolean(emailingId)} onClick={(e) => { e.stopPropagation(); sendBalanceEmail(student); }} title={busy ? 'Sending...' : 'Send balance statement'} aria-label={busy ? `Sending statement to ${student.name}` : `Send balance statement to ${student.name}`}>{busy ? <span className="btn-spinner" aria-hidden="true" /> : <Mail size={13} />}</button><button className="btn btn-primary btn-xs" onClick={(e) => { e.stopPropagation(); openPaymentModal(student); }} title="Record payment"><FileText size={13} /> Pay</button></div></td></tr>; })}
      </tbody></table></div>}

      {pages > 1 && (
        <div className="pagination-bar">
          <span className="pagination-count">
            Showing {students.length} of {total} student{total === 1 ? '' : 's'}
          </span>
          <div className="pagination-controls">
            <button className="btn btn-outline btn-sm" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span className="pagination-page">Page {page} of {pages}</span>
            <button className="btn btn-outline btn-sm" disabled={loading || page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* Quick Payment Modal */}
      {paymentModal && (
        <div className="dialog-overlay" onClick={closePaymentModal}>
          <div className="dialog-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <button className="dialog-close" onClick={closePaymentModal}><X size={18} /></button>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                {paymentModal.student.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                {paymentModal.student.regNumber} · {paymentModal.student.intakeTitle}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
                Balance: <strong style={{ color: 'var(--error)' }}>{money(paymentModal.student.balance)}</strong>
              </div>
            </div>
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div className="form-group">
                <label>Amount (RWF)</label>
                <input className="form-control" type="number" min="1" step="0.01" value={paymentModal.amount} onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label>Method</label>
                <select className="form-control" value={paymentModal.method} onChange={(e) => setPaymentModal({ ...paymentModal, method: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Bank</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference (optional)</label>
                <input className="form-control" value={paymentModal.reference} onChange={(e) => setPaymentModal({ ...paymentModal, reference: e.target.value })} placeholder="Receipt #" />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.3rem' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={closePaymentModal} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  <span className={submitting ? 'btn-spinner' : undefined} aria-hidden="true">{submitting ? '' : <Save size={13} />}</span> {submitting ? 'Saving...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
