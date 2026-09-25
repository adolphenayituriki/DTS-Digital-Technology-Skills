import React, { useEffect, useState } from 'react';
import { Plus, Receipt, Save, Eye, FileText, Download, Mail, MoreVertical, ChevronDown, ChevronUp, X } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

const today = () => new Date().toISOString().slice(0, 10);
const money = (value, currency = 'RWF') => `${Number(value || 0).toLocaleString('en-RW')} ${currency}`;
const emptyForm = { kind: 'payment', amount: '', studentId: '', intakeId: '', category: '', method: 'cash', status: 'completed', occurredAt: today(), reference: '', notes: '' };

export default function FinanceRecords() {
  const toast = useToast();
  const [intakes, setIntakes] = useState([]);
  const [students, setStudents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filterKind, setFilterKind] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const loadTransactions = () => apiFetch(`/finance/transactions${filterKind ? `?kind=${filterKind}` : ''}`).then((data) => setTransactions(Array.isArray(data) ? data : [])).catch((error) => toast.error(error.message || 'Failed to load transactions.'));
  useEffect(() => {
    Promise.all([apiFetch('/finance/intakes'), apiFetch('/finance/students')])
      .then(([intakeData, studentData]) => { setIntakes(Array.isArray(intakeData) ? intakeData : []); setStudents(Array.isArray(studentData) ? studentData : []); })
      .catch((error) => toast.error(error.message || 'Failed to load finance records.'))
      .finally(() => setLoading(false));
  }, [toast]);
  useEffect(() => { loadTransactions(); }, [filterKind]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectStudent = (studentId) => {
    const student = students.find((item) => item._id === studentId);
    setForm((current) => ({ ...current, studentId, intakeId: student?.intakeId || current.intakeId }));
  };
  const saveTransaction = async (event) => {
    event.preventDefault();
    if (form.kind === 'payment' && !form.studentId) { toast.error('Select a student for a payment.'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter an amount greater than zero.'); return; }
    setSaving(true);
    try {
      await apiFetch('/finance/transactions', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Finance record saved.');
      setForm(emptyForm);
      await loadTransactions();
    } catch (error) {
      toast.error(error.message || 'Failed to save finance record.');
    } finally { setSaving(false); }
  };
  const voidTransaction = async (id) => {
    try { await apiFetch(`/finance/transactions/${id}/void`, { method: 'PUT' }); toast.success('Transaction voided.'); await loadTransactions(); } catch (error) { toast.error(error.message || 'Failed to void transaction.'); }
  };
  
  const openTransactionDetail = (transaction) => setSelectedTransaction(transaction);
  const closeTransactionDetail = () => setSelectedTransaction(null);

  if (loading) return <div className="loading"><div className="spinner" />Loading finance records...</div>;

  const exportTransactionsCSV = () => {
    const headers = ['Date', 'Type', 'Student / Category', 'Amount', 'Currency', 'Status', 'Method', 'Reference', 'Notes', 'Recorded By'];
    const rows = transactions.map((t) => [
      new Date(t.occurredAt).toLocaleDateString(),
      t.kind,
      t.studentId?.name || t.category || 'General',
      Number(t.amount || 0).toFixed(2),
      t.currency || 'RWF',
      t.status,
      t.method,
      t.reference || '',
      (t.notes || '').replace(/"/g, '""'),
      t.recordedById?.name || t.recordedById?.email || '—',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="workspace-page">
      <div className="workspace-intro"><div><h2>Income & Expenses</h2><p>Record student payments, other income, and operating expenses in RWF.</p></div><Receipt size={24} className="workspace-header-icon" /></div>
      <div className="finance-layout">
        <form className="dash-panel finance-record-form" onSubmit={saveTransaction}>
          <div className="dash-panel-head"><h3><Plus size={17} /> New finance record</h3></div>
          <div className="student-form-grid">
            <div className="form-group"><label>Type</label><select className="form-control" value={form.kind} onChange={(e) => update('kind', e.target.value)}><option value="payment">Student payment</option><option value="income">Other income</option><option value="expense">Expense</option></select></div>
            <div className="form-group"><label>Amount (RWF)</label><input className="form-control" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} required /></div>
            {form.kind === 'payment' && <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Student</label><select className="form-control" value={form.studentId} onChange={(e) => selectStudent(e.target.value)} required><option value="">Select a student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name} · {student.regNumber} · {student.intakeTitle}</option>)}</select></div>}
            {form.kind !== 'payment' && <div className="form-group"><label>Intake / level (optional)</label><select className="form-control" value={form.intakeId} onChange={(e) => update('intakeId', e.target.value)}><option value="">General</option>{intakes.map((intake) => <option key={intake._id} value={intake._id}>{intake.title}</option>)}</select></div>}
            <div className="form-group"><label>Category</label><input className="form-control" value={form.category} onChange={(e) => update('category', e.target.value)} placeholder={form.kind === 'expense' ? 'e.g. Materials' : 'e.g. Training fee'} /></div>
            <div className="form-group"><label>Method</label><select className="form-control" value={form.method} onChange={(e) => update('method', e.target.value)}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="other">Other</option></select></div>
            <div className="form-group"><label>Date</label><input className="form-control" type="date" value={form.occurredAt} onChange={(e) => update('occurredAt', e.target.value)} /></div>
            <div className="form-group"><label>Status</label><select className="form-control" value={form.status} onChange={(e) => update('status', e.target.value)}><option value="completed">Completed</option><option value="pending">Pending</option></select></div>
            <div className="form-group"><label>Reference</label><input className="form-control" value={form.reference} onChange={(e) => update('reference', e.target.value)} placeholder="Receipt or transaction reference" /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Notes</label><textarea className="form-control" rows="2" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save record'}</button>
        </form>
        <div className="dash-panel finance-ledger-panel">
          <div className="dash-panel-head"><h3>Transaction ledger</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select className="form-control ledger-filter" value={filterKind} onChange={(e) => setFilterKind(e.target.value)}><option value="">All types</option><option value="payment">Payments</option><option value="income">Income</option><option value="expense">Expenses</option></select>
              <button className="btn btn-outline btn-sm" onClick={exportTransactionsCSV}><FileText size={14} /> Export CSV</button>
            </div>
          </div>
          <div className="table-scroll"><table className="admin-table compact-table"><thead><tr><th>Date</th><th>Type</th><th>Student / category</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {transactions.length === 0 && <tr><td colSpan={6} className="table-empty">No transactions recorded.</td></tr>}
            {transactions.map((transaction) => <tr key={transaction._id} onClick={() => openTransactionDetail(transaction)} style={{ cursor: 'pointer' }}><td>{new Date(transaction.occurredAt).toLocaleDateString()}</td><td><span className={`finance-kind ${transaction.kind}`}>{transaction.kind}</span></td><td><strong>{transaction.studentId?.name || transaction.category || 'General'}</strong><small className="table-subtext">{transaction.reference || transaction.notes || '—'}</small></td><td>{money(transaction.amount, transaction.currency)}</td><td><span className={`finance-status ${transaction.status === 'voided' ? 'status-neutral' : transaction.status === 'pending' ? 'status-partial' : 'status-paid'}`}>{transaction.status}</span></td><td><button className="btn btn-outline btn-xs" onClick={(e) => { e.stopPropagation(); voidTransaction(transaction._id); }}>Void</button></td></tr>)}
          </tbody></table></div>
        </div>
      </div>

      {selectedTransaction && (
        <div className="dialog-overlay" onClick={closeTransactionDetail}>
          <div className="dialog-card" style={{ maxWidth: '600px', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <button className="dialog-close" onClick={closeTransactionDetail}><X size={18} /></button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Transaction Details</h3>
              <button className="btn btn-outline btn-sm" onClick={() => {
                const headers = ['Date', 'Type', 'Student / Category', 'Amount', 'Currency', 'Status', 'Method', 'Reference', 'Notes', 'Recorded By'];
                const rows = [[
                  new Date(selectedTransaction.occurredAt).toLocaleDateString(),
                  selectedTransaction.kind,
                  selectedTransaction.studentId?.name || selectedTransaction.category || 'General',
                  Number(selectedTransaction.amount || 0).toFixed(2),
                  selectedTransaction.currency || 'RWF',
                  selectedTransaction.status,
                  selectedTransaction.method,
                  selectedTransaction.reference || '',
                  (selectedTransaction.notes || '').replace(/"/g, '""'),
                  selectedTransaction.recordedById?.name || selectedTransaction.recordedById?.email || '—',
                ]];
                const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transaction-${selectedTransaction._id}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}><FileText size={14} /> Export CSV</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem', marginBottom: '1rem' }}>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label><div>{new Date(selectedTransaction.occurredAt).toLocaleDateString()} {new Date(selectedTransaction.occurredAt).toLocaleTimeString()}</div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label><div><span className={`finance-kind ${selectedTransaction.kind}`}>{selectedTransaction.kind}</span></div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</label><div><strong>{money(selectedTransaction.amount, selectedTransaction.currency)}</strong></div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label><div><span className={`finance-status ${selectedTransaction.status === 'voided' ? 'status-neutral' : selectedTransaction.status === 'pending' ? 'status-partial' : 'status-paid'}`}>{selectedTransaction.status}</span></div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</label><div>{selectedTransaction.method}</div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Currency</label><div>{selectedTransaction.currency || 'RWF'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student / Category</label><div><strong>{selectedTransaction.studentId?.name || selectedTransaction.category || 'General'}</strong>{selectedTransaction.studentId && <small className="table-subtext">{selectedTransaction.studentId.regNumber} · {selectedTransaction.studentId.email}</small>}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intake</label><div>{selectedTransaction.intakeId?.title || (selectedTransaction.intakeId?.program ? `Program: ${selectedTransaction.intakeId.program}` : 'General')}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference</label><div>{selectedTransaction.reference || '—'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label><div>{selectedTransaction.notes || '—'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recorded By</label><div>{selectedTransaction.recordedById?.name || selectedTransaction.recordedById?.email || '—'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recorded At</label><div>{new Date(selectedTransaction.createdAt).toLocaleString()}</div></div>
            </div>
            {selectedTransaction.studentId && selectedTransaction.kind === 'payment' && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f4f8' }}>
                <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); apiFetch(`/finance/students/${selectedTransaction.studentId._id}/send-balance`, { method: 'POST' }).then(() => toast.success('Balance statement sent to student.')).catch(() => toast.error('Failed to send email.')); }}>
                  <Mail size={14} /> Send Balance Statement to Student
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
