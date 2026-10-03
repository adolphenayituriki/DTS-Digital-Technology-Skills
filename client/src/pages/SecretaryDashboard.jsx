import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Users, FileText, Calendar, ClipboardList,
  ArrowUpRight, Inbox, GraduationCap, Star, UserCog,
  CheckCircle2, AlertCircle, Eye,
} from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

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
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setFailed(false);
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
