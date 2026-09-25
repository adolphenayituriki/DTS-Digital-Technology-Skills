import React, { useEffect, useState } from 'react';
import { Plus, Receipt, Save } from 'lucide-react';
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

  if (loading) return <div className="loading"><div className="spinner" />Loading finance records...</div>;

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
          <div className="dash-panel-head"><h3>Transaction ledger</h3><select className="form-control ledger-filter" value={filterKind} onChange={(e) => setFilterKind(e.target.value)}><option value="">All types</option><option value="payment">Payments</option><option value="income">Income</option><option value="expense">Expenses</option></select></div>
          <div className="table-scroll"><table className="admin-table compact-table"><thead><tr><th>Date</th><th>Type</th><th>Student / category</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
            {transactions.length === 0 && <tr><td colSpan={6} className="table-empty">No transactions recorded.</td></tr>}
            {transactions.map((transaction) => <tr key={transaction._id}><td>{new Date(transaction.occurredAt).toLocaleDateString()}</td><td><span className={`finance-kind ${transaction.kind}`}>{transaction.kind}</span></td><td><strong>{transaction.studentId?.name || transaction.category || 'General'}</strong><small className="table-subtext">{transaction.reference || transaction.notes || '—'}</small></td><td>{money(transaction.amount, transaction.currency)}</td><td><span className={`finance-status ${transaction.status === 'voided' ? 'status-neutral' : transaction.status === 'pending' ? 'status-partial' : 'status-paid'}`}>{transaction.status}</span></td><td>{transaction.status !== 'voided' && <button className="btn btn-outline btn-xs" onClick={() => voidTransaction(transaction._id)}>Void</button>}</td></tr>)}
          </tbody></table></div>
        </div>
      </div>
    </div>
  );
}
