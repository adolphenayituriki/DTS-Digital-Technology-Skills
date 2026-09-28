import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Users, FileText, Calendar, ClipboardList,
  ArrowUpRight, PlusCircle, ArrowRight, Inbox, GraduationCap, Star, UserCog, Inbox as InboxIcon,
} from 'lucide-react';
import apiFetch from '../../api';
import { useToast } from '../../components/Toast';

const statusMap = {
  pending: { label: 'Pending', color: 'var(--warning)', tone: 'var(--warning-soft)' },
  reviewed: { label: 'Reviewed', color: 'var(--primary)', tone: 'var(--primary-soft)' },
  accepted: { label: 'Accepted', color: 'var(--success)', tone: 'var(--success-soft)' },
  rejected: { label: 'Rejected', color: 'var(--error)', tone: 'var(--error-soft)' },
};

const cards = [
  { label: 'Total Messages', key: 'messages', sub: 'unreadMessages', icon: <MessageSquare size={16} />, iconBg: 'sky', to: '/admin/messages' },
  { label: 'Total Members', key: 'members', icon: <Users size={16} />, iconBg: 'green', to: '/admin/members' },
  { label: 'Total Posts', key: 'posts', sub: 'publishedPosts', icon: <FileText size={16} />, iconBg: 'blue', to: '/admin/posts' },
  { label: 'Open Intakes', key: 'intakes', sub: 'totalIntakes', icon: <Calendar size={16} />, iconBg: 'amber', to: '/admin/intakes' },
  { label: 'Applications', key: 'applications', sub: 'pendingApplications', meter: 'pendingApplications', meterNote: 'pending', icon: <ClipboardList size={16} />, iconBg: 'violet', to: '/admin/applications' },
  { label: 'Students', key: 'students', sub: 'activeStudents', meter: 'activeStudents', meterNote: 'active', icon: <GraduationCap size={16} />, iconBg: 'sky', to: '/admin/students' },
  { label: 'Testimonials', key: 'testimonials', sub: 'pendingTestimonials', icon: <Star size={16} />, iconBg: 'green', to: '/admin/testimonials' },
  { label: 'Staff Accounts', key: 'staffAccounts', sub: 'activeAssignments', icon: <UserCog size={16} />, iconBg: 'rose', to: '/admin/users' },
];

const quickActions = [
  { label: 'Create New Post', to: '/admin/posts', icon: <PlusCircle size={16} />, iconBg: 'blue' },
  { label: 'Review Applications', to: '/admin/applications', icon: <ClipboardList size={16} />, iconBg: 'violet' },
  { label: 'Manage Intakes', to: '/admin/intakes', icon: <Calendar size={16} />, iconBg: 'amber' },
  { label: 'Read Messages', to: '/admin/messages', icon: <InboxIcon size={16} />, iconBg: 'sky' },
];

const subLabels = {
  unreadMessages: 'unread',
  publishedPosts: 'published',
  totalIntakes: 'total',
  pendingApplications: 'pending',
  activeStudents: 'active',
  pendingTestimonials: 'awaiting approval',
  activeAssignments: 'active assignments',
};

const today = new Date().toLocaleDateString('en-GB', {
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
});

export default function Dashboard() {
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
        toast.error(err.message || 'Failed to load dashboard statistics.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading dashboard...</div>;

  if (failed || !stats) {
    return (
      <div className="alert alert-error">
        Statistics could not be loaded.{' '}
        <button className="btn btn-outline btn-xs" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-dash">
      <div className="admin-dash-grid">
        {cards.map((c) => {
          const total = stats[c.key] ?? 0;
          const part = c.meter ? stats[c.meter] ?? 0 : 0;
          const pct = total > 0 ? Math.round((part / total) * 100) : 0;
          return (
            <Link key={c.key} to={c.to} className={`stat-card stat-chip-${c.iconBg}`}>
              <div className="stat-top">
                <div>
                  <div className="stat-value">{total}</div>
                  {c.sub && (
                    <div className="stat-sub">{stats[c.sub] ?? 0} <span className="stat-sub-label">{subLabels[c.sub] || ''}</span></div>
                  )}
                </div>
                <div className={`stat-chip stat-chip-${c.iconBg}`}>{c.icon}</div>
              </div>
              <div className="stat-label">{c.label}</div>
              {c.meter && (
                <div className={`stat-meter stat-meter-${c.iconBg}`} title={`${pct}% ${c.meterNote}`}>
                  <i style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="stat-footer">
                <span className="stat-view">View <ArrowUpRight size={11} /></span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="dash-row">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <Inbox size={17} /> Latest Applications
              {recent.length > 0 && <span className="dash-pill">{recent.length} recent</span>}
            </h3>
            <Link to="/admin/applications" className="dash-panel-link">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="dash-empty">
              <ClipboardList size={26} />
              <p>No applications yet.</p>
            </div>
          ) : (
            <div className="dash-list">
              {recent.map((a) => {
                const s = statusMap[a.status] || statusMap.pending;
                return (
                  <Link key={a._id} to={`/admin/applications`} className="dash-list-item">
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
            <h3>Quick Actions</h3>
          </div>
          <div className="dash-actions">
            {quickActions.map((a) => (
              <Link key={a.to} to={a.to} className={`dash-action dash-action-${a.iconBg}`}>
                <span className={`dash-action-icon dash-action-icon-${a.iconBg}`}>{a.icon}</span>
                {a.label}
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
          <p className="dash-tip">All figures above are read live from the database. Today: {today}</p>
        </div>
      </div>
    </div>
  );
}
