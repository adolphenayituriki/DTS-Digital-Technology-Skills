import React, { useEffect, useState } from 'react';
import { Search, Wallet } from 'lucide-react';
import apiFetch from '../api';
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
  const [intakes, setIntakes] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ intakeId: '', status: '', q: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/finance/intakes').then((data) => setIntakes(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    apiFetch(`/finance/students?${params.toString()}`)
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(error.message || 'Failed to load student balances.'))
      .finally(() => setLoading(false));
  }, [filters, toast]);

  return (
    <div className="workspace-page">
      <div className="workspace-intro"><div><h2>Student Balances</h2><p>Track required fees and payments by student, level, or intake.</p></div><Wallet size={24} className="workspace-header-icon" /></div>
      <div className="app-adm-toolbar">
        <select className="form-control workspace-filter" value={filters.intakeId} onChange={(e) => setFilters((current) => ({ ...current, intakeId: e.target.value }))}><option value="">All intakes / levels</option>{intakes.map((intake) => <option key={intake._id} value={intake._id}>{intake.title}</option>)}</select>
        <select className="form-control workspace-filter" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}><option value="">All statuses</option><option value="active">Active</option><option value="applicant">Applicant</option><option value="rejected">Rejected</option></select>
        <div className="search-box workspace-search"><Search size={15} /><input type="search" value={filters.q} onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))} placeholder="Search name, reg #, email..." /></div>
      </div>
      {loading ? <div className="loading"><div className="spinner" />Loading balances...</div> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Student</th><th>Intake / level</th><th>Required</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>
        {students.length === 0 && <tr><td colSpan={6} className="table-empty">No student balances found.</td></tr>}
        {students.map((student) => { const meta = statusMeta[student.paymentStatus] || statusMeta.not_configured; return <tr key={student._id}><td><strong>{student.name}</strong><small className="table-subtext">{student.regNumber} · {student.email}</small></td><td>{student.intakeTitle}<small className="table-subtext">{student.intakeProgram}</small></td><td>{money(student.expected)}</td><td>{money(student.paid)}</td><td className={student.balance > 0 ? 'text-danger' : 'text-success'}>{money(student.balance)}</td><td><span className={`finance-status ${meta.className}`}>{meta.label}</span></td></tr>; })}
      </tbody></table></div>}
    </div>
  );
}
