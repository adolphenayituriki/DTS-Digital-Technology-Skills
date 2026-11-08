import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Users, FileText, Calendar, ClipboardList,
  ArrowUpRight, Inbox, GraduationCap, Star, UserCog,
  CheckCircle2, AlertCircle, Eye, Banknote, CreditCard,
  TrendingDown, Download,
} from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

const money = (value) => `${Number(value || 0).toLocaleString('en-RW')} RWF`;

const statusMap = {
  pending: { label: 'Pending', color: 'var(--warning)', tone: 'var(--warning-soft)' },
  reviewed: { label: 'Reviewed', color: 'var(--primary)', tone: 'var(--primary-soft)' },
  accepted: { label: 'Accepted', color: 'var(--success)', tone: 'var(--success-soft)' },
  rejected: { label: 'Rejected', color: 'var(--error)', tone: 'var(--error-soft)' },
};

const attentionCards = [
  {
    key: 'pendingApplications', label: 'Applications to review',
    icon: <ClipboardList size={16} />, iconBg: 'violet',
    to: '/admin/applications', action: 'View',
    ofKey: 'applications', ofLabel: 'received',
  },
  {
    key: 'unreadMessages', label: 'Unread messages',
    icon: <Inbox size={16} />, iconBg: 'sky',
    to: '/admin/messages', action: 'View',
    ofKey: 'messages', ofLabel: 'total',
  },
  {
    key: 'pendingTestimonials', label: 'Testimonials awaiting approval',
    icon: <Star size={16} />, iconBg: 'green',
    to: '/admin/testimonials', action: 'View',
    ofKey: 'testimonials', ofLabel: 'received',
  },
];

const overviewCards = [
  {
    key: 'students', label: 'Students', sub: 'activeStudents', subLabel: 'active',
    meter: 'activeStudents', meterNote: 'active',
    icon: <GraduationCap size={16} />, iconBg: 'sky', to: '/admin/students',
  },
  {
    key: 'intakes', label: 'Open intakes', sub: 'totalIntakes', subLabel: 'total',
    icon: <Calendar size={16} />, iconBg: 'amber', to: '/admin/intakes',
  },
  {
    key: 'posts', label: 'Posts', sub: 'publishedPosts', subLabel: 'published',
    icon: <FileText size={16} />, iconBg: 'blue', to: '/admin/posts',
  },
  {
    key: 'members', label: 'Members',
    icon: <Users size={16} />, iconBg: 'green', to: '/admin/members',
  },
  {
    key: 'staffAccounts', label: 'Staff accounts', sub: 'trainers', subLabel: 'trainers',
    icon: <UserCog size={16} />, iconBg: 'rose', to: '/admin/users',
  },
  {
    key: 'applications', label: 'Applications total',
    icon: <ClipboardList size={16} />, iconBg: 'violet', to: '/admin/applications',
  },
];

const today = new Date().toLocaleDateString('en-GB', {
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
});

function StatTile({ card, stats, variant }) {
  const total = stats[card.key] ?? 0;
  const part = card.meter ? stats[card.meter] ?? 0 : 0;
  const pct = total > 0 ? Math.round((part / total) * 100) : 0;
  const of = card.ofKey ? stats[card.ofKey] ?? 0 : null;

  return (
    <Link
      to={card.to}
      className={`stat-card stat-chip-${card.iconBg}${variant === 'attention' ? ' stat-card-attention' : ''}`}
    >
      <div className="stat-top">
        <div>
          <div className="stat-value">{total}</div>
          {variant === 'attention' ? (
            of !== null && <div className="stat-sub">{of} <span className="stat-sub-label">{card.ofLabel}</span></div>
          ) : (
            card.sub && (
              <div className="stat-sub">
                {stats[card.sub] ?? 0} <span className="stat-sub-label">{card.subLabel}</span>
              </div>
            )
          )}
        </div>
        <div className={`stat-chip stat-chip-${card.iconBg}`}>{card.icon}</div>
      </div>
      <div className="stat-label">{card.label}</div>
      {card.meter && (
        <div className={`stat-meter stat-meter-${card.iconBg}`} title={`${pct}% ${card.meterNote}`}>
          <i style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="stat-footer">
        <span className="stat-view">
          <Eye size={11} /> View <ArrowUpRight size={11} />
        </span>
      </div>
    </Link>
  );
}

export default function SecretaryDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [finance, setFinance] = useState(null);
  const [financeFailed, setFinanceFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setFailed(false);
    setFinanceFailed(false);
    apiFetch('/stats')
      .then((d) => {
        const { recentApplications, ...counts } = d || {};
        setStats(counts);
        setRecent(Array.isArray(recentApplications) ? recentApplications : []);
      })
      .catch((err) => {
        setFailed(true);
        setStats(null);
        toast.error(err.message || 'Failed to load office overview.');
      })
      .finally(() => setLoading(false));
    apiFetch('/stats/finance')
      .then(setFinance)
      .catch(() => {
        setFinanceFailed(true);
        setFinance(null);
      });
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading office overview...</div>;

  if (failed || !stats) {
    return (
      <div className="alert alert-error">
        Office overview could not be loaded.{' '}
        <button className="btn btn-outline btn-xs" onClick={load}>Retry</button>
      </div>
    );
  }

  const outstanding = attentionCards.filter((card) => (stats[card.key] ?? 0) > 0);
  const queueTotal = attentionCards.reduce((sum, card) => sum + (stats[card.key] ?? 0), 0);

  const financeCards = finance
    ? [
        {
          label: 'Expected fees', value: money(finance.expected),
          icon: <CreditCard size={17} />, tone: 'sky',
        },
        {
          label: 'Collected', value: money(finance.paid),
          icon: <Banknote size={17} />, tone: 'green',
          meter: finance.expected > 0 ? (finance.paid / finance.expected) * 100 : 0,
          meterNote: 'of expected fees collected',
        },
        {
          label: 'Outstanding', value: money(finance.outstanding),
          icon: <Users size={17} />, tone: 'amber',
          meter: finance.expected > 0 ? (finance.outstanding / finance.expected) * 100 : 0,
          meterNote: 'of expected fees still due',
        },
        {
          label: 'Net position', value: money(finance.net),
          icon: <TrendingDown size={17} />, tone: 'violet',
        },
      ]
    : [];

  const exportFinanceReport = () => {
    if (!finance) return;
    const wb = XLSX.utils.book_new();
    const generated = new Date().toLocaleString('en-GB');

    const summary = [
      ['DTS Finance Report'],
      ['Generated', generated],
      [],
      ['Metric', 'Amount (RWF)'],
      ['Students', finance.studentCount],
      ['Expected fees', finance.expected],
      ['Collected', finance.paid],
      ['Outstanding', finance.outstanding],
      ['Other income', finance.otherIncome],
      ['Expenses', finance.expenses],
      ['Net position', finance.net],
      [],
      ['Intake', 'Program', 'Students', 'Tuition fee', 'Expected', 'Paid', 'Outstanding'],
    ];
    (finance.byIntake || []).forEach((row) => {
      summary.push([
        row.title, row.program, row.studentCount, row.tuitionFee,
        row.expected, row.paid, row.outstanding,
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

    const monthly = [['Month', 'Fee income', 'Other income', 'Expenses', 'Net']];
    (finance.monthly || []).forEach((row) => {
      monthly.push([row.month, row.income, row.otherIncome, row.expenses, row.net]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthly), 'Monthly Report');

    XLSX.writeFile(wb, `dts-finance-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="admin-dash">
      {outstanding.length > 0 ? (
        <section className="dash-section">
          <div className="dash-section-head">
            <h2 className="is-attention">
              <AlertCircle size={15} /> Items requiring attention
            </h2>
            <p>{queueTotal} item{queueTotal === 1 ? '' : 's'} for review across {outstanding.length} area{outstanding.length === 1 ? '' : 's'}</p>
          </div>
          <div className="admin-dash-grid">
            {outstanding.map((card) => (
              <StatTile key={card.key} card={card} stats={stats} variant="attention" />
            ))}
          </div>
        </section>
      ) : (
        <div className="dash-clear">
          <CheckCircle2 size={17} />
          <p><b>All clear.</b> No pending items requiring immediate action.</p>
        </div>
      )}

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Office overview</h2>
          <p>Key records across the website &middot; {today}</p>
        </div>
        <div className="admin-dash-grid">
          {overviewCards.map((card) => (
            <StatTile key={card.key} card={card} stats={stats} />
          ))}
        </div>
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Finance snapshot</h2>
          <p>
            Read-only money summary &middot; {today}
            <button
              type="button"
              className="btn btn-outline btn-xs"
              style={{ marginLeft: 10 }}
              onClick={exportFinanceReport}
              disabled={!finance}
            >
              <Download size={12} /> Export report
            </button>
          </p>
        </div>
        {financeFailed ? (
          <div className="alert alert-error">
            Finance summary could not be loaded.{' '}
            <button className="btn btn-outline btn-xs" onClick={load}>Retry</button>
          </div>
        ) : !finance ? (
          <div className="loading"><div className="spinner" />Loading finance summary...</div>
        ) : (
          <>
            <div className="admin-dash-grid">
              {financeCards.map((card) => (
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

            <div className="dash-panel" style={{ marginTop: 16 }}>
              <div className="dash-panel-head">
                <h3>Balances by intake</h3>
                <span className="dash-pill">{finance.byIntake?.length || 0} intakes</span>
              </div>
              <div className="table-scroll">
                <table className="admin-table compact-table">
                  <thead>
                    <tr><th>Intake</th><th>Students</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Rate</th></tr>
                  </thead>
                  <tbody>
                    {(finance.byIntake || []).map((intake) => {
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
                    {!finance.byIntake?.length && <tr><td colSpan={6} className="table-empty">No intakes configured.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dash-panel" style={{ marginTop: 16 }}>
              <div className="dash-panel-head">
                <h3>Monthly report</h3>
                <button type="button" className="btn btn-outline btn-sm" onClick={exportFinanceReport}>
                  <Download size={13} /> Export XLSX
                </button>
              </div>
              <div className="table-scroll">
                <table className="admin-table compact-table">
                  <thead>
                    <tr><th>Month</th><th>Fee income</th><th>Other income</th><th>Expenses</th><th>Net</th></tr>
                  </thead>
                  <tbody>
                    {(finance.monthly || []).map((row) => (
                      <tr key={row.month}>
                        <td>{row.month}</td>
                        <td>{money(row.income)}</td>
                        <td>{money(row.otherIncome)}</td>
                        <td>{money(row.expenses)}</td>
                        <td className={row.net >= 0 ? 'text-success' : 'text-danger'}>{money(row.net)}</td>
                      </tr>
                    ))}
                    {!finance.monthly?.length && <tr><td colSpan={5} className="table-empty">No transactions yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="dash-row">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <Inbox size={17} /> Latest Applications
              {recent.length > 0 && <span className="dash-pill">{recent.length} recent</span>}
            </h3>
            <Link to="/admin/applications" className="dash-panel-link">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="dash-empty">
              <ClipboardList size={26} />
              <p>No applications received yet.</p>
            </div>
          ) : (
            <div className="dash-list">
              {recent.map((a) => {
                const s = statusMap[a.status] || statusMap.pending;
                return (
                  <Link key={a._id} to="/admin/applications" className="dash-list-item">
                    <div className="dash-av mini">{((a.name || 'A')[0]).toUpperCase()}</div>
                    <div className="dash-list-meta">
                      <p>{a.name} <span className="dash-program">{a.program}</span></p>
                      <small>{a.intakeTitle || 'Intake'}</small>
                    </div>
                    <span
                      className="dash-status"
                      style={{ color: s.color, background: s.tone }}
                    >{s.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="dash-panel quick-panel">
          <div className="dash-panel-head">
            <h3>Quick links</h3>
          </div>
          <div className="dash-actions">
            <Link to="/admin/applications" className="dash-action dash-action-violet">
              <span className="dash-action-icon dash-action-icon-violet"><ClipboardList size={16} /></span>
              View Applications
              <ArrowUpRight size={15} />
            </Link>
            <Link to="/admin/students" className="dash-action dash-action-sky">
              <span className="dash-action-icon dash-action-icon-sky"><GraduationCap size={16} /></span>
              View Students
              <ArrowUpRight size={15} />
            </Link>
            <Link to="/admin/messages" className="dash-action dash-action-sky">
              <span className="dash-action-icon dash-action-icon-sky"><MessageSquare size={16} /></span>
              View Messages
              <ArrowUpRight size={15} />
            </Link>
            <Link to="/admin/intakes" className="dash-action dash-action-amber">
              <span className="dash-action-icon dash-action-icon-amber"><Calendar size={16} /></span>
              View Intakes
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <p className="dash-tip">
            <MessageSquare size={11} /> Read-only overview of essential operations.
          </p>
        </div>
      </div>
    </div>
  );
}
