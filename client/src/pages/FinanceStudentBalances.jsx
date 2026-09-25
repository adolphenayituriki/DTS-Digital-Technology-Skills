import React, { useEffect, useState } from 'react';
import { Search, Wallet, Download, Mail, FileText, X, Save, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiFetch, { onFinanceRefresh, triggerFinanceRefresh } from '../api';
import { useToast } from '../components/Toast';

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
  const [paymentModal, setPaymentModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Check if we came from a student selection (pre-fill for payment)
  const prefillStudentId = searchParams.get('studentId');
  if (prefillStudentId) {
    navigate('/finance/records', { replace: true, state: { prefillStudentId } });
  }

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    apiFetch(`/finance/students?${params.toString()}`)
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(error.message || 'Failed to load student balances.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiFetch('/finance/intakes').then((data) => setIntakes(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
    const cleanup = onFinanceRefresh(loadData);
    return cleanup;
  }, [filters, toast]);

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
      toast.success(`Payment of ${money(amount)} recorded for ${paymentModal.student.name}.`);
      closePaymentModal();
      triggerFinanceRefresh();
    } catch (error) {
      toast.error(error.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendBalanceEmail = async (student) => {
    try {
      await apiFetch(`/finance/students/${student._id}/send-balance`, { method: 'POST' });
      toast.success(`Balance statement sent to ${student.email}`);
    } catch (error) {
      toast.error(error.message || 'Failed to send email.');
    }
  };

  const sendBulkBalanceEmails = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      const res = await apiFetch('/finance/students/send-balance-bulk', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(params)),
      });
      toast.success(res.message);
    } catch (error) {
      toast.error(error.message || 'Failed to send bulk emails.');
    }
  };

  const exportCSV = () => {
    const headers = ['Student', 'Registration Number', 'Email', 'Intake / Level', 'Program', 'Required', 'Paid', 'Balance', 'Status'];
    const rows = students.map((s) => {
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
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-balances-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div><h2>Student Balances</h2><p>Track required fees and payments by student, level, or intake.</p></div>
        <div className="workspace-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Wallet size={24} className="workspace-header-icon" />
          <button className="btn btn-outline btn-sm" onClick={exportCSV}><FileText size={14} /> Export CSV</button>
          <button className="btn btn-outline btn-sm" onClick={sendBulkBalanceEmails}><Mail size={14} /> Email All Filtered</button>
        </div>
      </div>
      <div className="app-adm-toolbar">
        <select className="form-control workspace-filter" value={filters.intakeId} onChange={(e) => setFilters((current) => ({ ...current, intakeId: e.target.value }))}><option value="">All intakes / levels</option>{intakes.map((intake) => <option key={intake._id} value={intake._id}>{intake.title}</option>)}</select>
        <select className="form-control workspace-filter" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}><option value="">All statuses</option><option value="active">Active</option><option value="applicant">Applicant</option><option value="rejected">Rejected</option></select>
        <div className="search-box workspace-search"><Search size={15} /><input type="search" value={filters.q} onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))} placeholder="Search name, reg #, email..." /></div>
      </div>
      {loading ? <div className="loading"><div className="spinner" />Loading balances...</div> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Student</th><th>Intake / level</th><th>Required</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {students.length === 0 && <tr><td colSpan={7} className="table-empty">No student balances found.</td></tr>}
        {students.map((student) => { const meta = statusMeta[student.paymentStatus] || statusMeta.not_configured; return <tr key={student._id} style={{ cursor: 'pointer' }}><td><strong>{student.name}</strong><small className="table-subtext">{student.regNumber} · {student.email}</small></td><td>{student.intakeTitle}<small className="table-subtext">{student.intakeProgram}</small></td><td>{money(student.expected)}</td><td>{money(student.paid)}</td><td className={student.balance > 0 ? 'text-danger' : 'text-success'}>{money(student.balance)}</td><td><span className={`finance-status ${meta.className}`}>{meta.label}</span></td><td><div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}><button className="btn btn-outline btn-xs" onClick={(e) => { e.stopPropagation(); sendBalanceEmail(student); }} title="Send balance statement"><Mail size={13} /></button><button className="btn btn-primary btn-xs" onClick={(e) => { e.stopPropagation(); openPaymentModal(student); }} title="Record payment"><FileText size={13} /> Pay</button></div></td></tr>; })}
      </tbody></table></div>}

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
                  {submitting ? <Loader2 size={13} className="spinner" /> : <Save size={13} />} {submitting ? 'Saving...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
