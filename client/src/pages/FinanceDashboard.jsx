import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Banknote, CreditCard, Receipt, TrendingDown, Users } from 'lucide-react';
import apiFetch, { onFinanceRefresh } from '../api';
import { useToast } from '../components/Toast';

const money = (value) => `${Number(value || 0).toLocaleString('en-RW')} RWF`;

export default function FinanceDashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState('all');

  const loadData = () => {
    apiFetch('/finance/dashboard')
      .then(setData)
      .catch((error) => toast.error(error.message || 'Failed to load finance dashboard.'))
      .finally(() => setLoading(false));
    apiFetch('/finance/reports/monthly').then(setReport).catch(() => {});
  };

  useEffect(() => {
    loadData();
    const cleanup = onFinanceRefresh(loadData);
    return cleanup;
  }, [toast]);

  if (loading) return <div className="loading"><div className="spinner" />Loading finance workspace...</div>;
  if (!data) return <div className="alert alert-error">Finance data is unavailable.</div>;

  const cards = [
    { label: 'Expected Fees', value: money(data.expected), icon: <CreditCard size={17} />, tone: 'sky' },
    { label: 'Collected', value: money(data.paid), icon: <Banknote size={17} />, tone: 'green', meter: data.expected > 0 ? (data.paid / data.expected) * 100 : 0, meterNote: 'of expected fees collected' },
    { label: 'Outstanding', value: money(data.outstanding), icon: <Users size={17} />, tone: 'amber', meter: data.expected > 0 ? (data.outstanding / data.expected) * 100 : 0, meterNote: 'of expected fees still due' },
    { label: 'Net Position', value: money(data.net), icon: <TrendingDown size={17} />, tone: 'violet' },
  ];

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div><h2>Finance overview</h2><p>Private staff view of student payments, income, expenses, and balances.</p></div>
        <Link to="/finance/records" className="btn btn-primary">Record transaction <ArrowUpRight size={15} /></Link>
      </div>
      <div className="admin-dash-grid">
        {cards.map((card) => (
          <div key={card.label} className={`stat-card tone-${card.tone}`}>
            <div className="stat-top">
              <div className="stat-value stat-money">{card.value}</div>
              <div className="stat-chip">{card.icon}</div>
            </div>
            <div className="stat-label">{card.label}</div>
            {card.meter !== undefined && (
              <div className="stat-meter" title={`${Math.round(card.meter)}% ${card.meterNote}`}>
                <i style={{ width: `${Math.min(100, Math.max(0, card.meter))}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="dash-row">
        <div className="dash-panel">
          <div className="dash-panel-head"><h3>Balances by intake</h3><Link to="/finance/students" className="dash-panel-link">Student balances <ArrowUpRight size={14} /></Link></div>
          <div className="table-scroll"><table className="admin-table compact-table"><thead><tr><th>Intake</th><th>Students</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Rate</th></tr></thead><tbody>
            {(data.byIntake || []).map((intake) => {
              const rate = intake.expected > 0 ? Math.round((intake.paid / intake.expected) * 100) : 0;
              const tone = rate >= 100 ? 'green' : rate >= 50 ? 'sky' : 'amber';
              return (
                <tr key={intake._id}>
                  <td><strong>{intake.title}</strong><small className="table-subtext">{intake.program}</small></td>
                  <td>{intake.studentCount}</td>
                  <td>{money(intake.expected)}</td>
                  <td>{money(intake.paid)}</td>
                  <td className={intake.outstanding > 0 ? 'text-danger' : 'text-success'}>{money(intake.outstanding)}</td>
                  <td>
                    <div className={`meter-cell tone-${tone}`} title={`${rate}% of expected fees collected`}>
                      <div className="meter-cell-track"><i style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} /></div>
                      <span>{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!data.byIntake?.length && <tr><td colSpan={6} className="table-empty">No intakes configured.</td></tr>}
          </tbody></table></div>
        </div>
        <div className="dash-panel quick-panel">
          <div className="dash-panel-head"><h3>Ledger summary</h3></div>
          <div className="readiness-list"><div><span>Other income</span><strong>{money(data.otherIncome)}</strong></div><div><span>Expenses</span><strong>{money(data.expenses)}</strong></div><div><span>Recent records</span><strong>{data.recentTransactions?.length || 0}</strong></div></div>
          <Link to="/finance/records" className="btn btn-outline btn-sm workspace-full-button"><Receipt size={14} /> Open ledger</Link>
        </div>
      </div>
      <div className="dash-panel">
        <div className="dash-panel-head"><h3>Monthly report</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="all">All months</option>
              {(report?.rows || []).map(r => <option key={r.month} value={r.month}>{r.month}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={() => {
              const rows = (report?.rows || []).filter(r => selectedMonth === 'all' || r.month === selectedMonth);
              const wsData = [['Month','Fee income','Other income','Expenses','Net']];
              rows.forEach(r => wsData.push([r.month, r.income, r.otherIncome, r.expenses, null]));
              const ws = XLSX.utils.aoa_to_sheet(wsData);
              rows.forEach((r, i) => {
                const row = i + 2;
                ws[`E${row}`] = { t: 'n', f: `B${row}+C${row}-D${row}` };
              });
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');
              XLSX.writeFile(wb, selectedMonth === 'all' ? 'monthly-report.xlsx' : `monthly-report-${selectedMonth}.xlsx`);
            }}>Export XLSX</button>
          </div>
        </div>
        <div className="table-scroll"><table className="admin-table compact-table"><thead><tr><th>Month</th><th>Fee income</th><th>Other income</th><th>Expenses</th><th>Net</th></tr></thead><tbody>
          {(report?.rows || []).filter(r => selectedMonth === 'all' || r.month === selectedMonth).map((r) => (
            <tr key={r.month}>
              <td>{r.month}</td>
              <td>{money(r.income)}</td>
              <td>{money(r.otherIncome)}</td>
              <td>{money(r.expenses)}</td>
              <td className={r.net >= 0 ? 'text-success' : 'text-danger'}>{money(r.net)}</td>
            </tr>
          ))}
          {!report?.rows?.length && <tr><td colSpan={5} className="table-empty">No transactions yet.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
