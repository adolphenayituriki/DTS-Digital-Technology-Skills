import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Users, FileText, Calendar, ClipboardList,
  ArrowUpRight, PlusCircle, ArrowRight, Inbox, GraduationCap, Star, UserCog, Inbox as InboxIcon,
} from 'lucide-react';
import apiFetch from '../../api';
import { useToast } from '../../components/Toast';

const statusMap = {
  pending: { label: 'Pending', color: 'var(--warning)' },
  reviewed: { label: 'Reviewed', color: 'var(--primary)' },
  accepted: { label: 'Accepted', color: 'var(--success)' },
  rejected: { label: 'Rejected', color: 'var(--error)' },
};

const cards = [
  { label: 'Total Messages', key: 'messages', sub: 'unreadMessages', icon: <MessageSquare size={17} />, tone: 'sky', to: '/admin/messages' },
  { label: 'Total Members', key: 'members', icon: <Users size={17} />, tone: 'green', to: '/admin/members' },
  { label: 'Total Posts', key: 'posts', sub: 'publishedPosts', icon: <FileText size={17} />, tone: 'blue', to: '/admin/posts' },
  { label: 'Open Intakes', key: 'intakes', sub: 'totalIntakes', icon: <Calendar size={17} />, tone: 'amber', to: '/admin/intakes' },
  { label: 'Applications', key: 'applications', sub: 'pendingApplications', meter: 'pendingApplications', meterNote: 'pending', icon: <ClipboardList size={17} />, tone: 'violet', to: '/admin/applications' },
  { label: 'Students', key: 'students', sub: 'activeStudents', meter: 'activeStudents', meterNote: 'active', icon: <GraduationCap size={17} />, tone: 'sky', to: '/admin/students' },
  { label: 'Testimonials', key: 'testimonials', sub: 'pendingTestimonials', icon: <Star size={17} />, tone: 'green', to: '/admin/testimonials' },
  { label: 'Staff Accounts', key: 'staffAccounts', sub: 'activeAssignments', icon: <UserCog size={17} />, tone: 'rose', to: '/admin/users' },
];

const quickActions = [
  { label: 'Create New Post', to: '/admin/posts', icon: <PlusCircle size={17} /> },
  { label: 'Review Applications', to: '/admin/applications', icon: <ClipboardList size={17} /> },
  { label: 'Manage Intakes', to: '/admin/intakes', icon: <Calendar size={17} /> },
  { label: 'Read Messages', to: '/admin/messages', icon: <InboxIcon size={17} /> },
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
            <Link key={c.key} to={c.to} className={`stat-card tone-${c.tone}`}>
              <div className="stat-top">
                <div className="stat-value">{total}</div>
                <div className="stat-chip">{c.icon}</div>
              </div>
              <div className="stat-label">{c.label}</div>
              {c.sub && (
                <div className="stat-sub">{stats[c.sub] ?? 0} {subLabels[c.sub] || ''}</div>
              )}
              {c.meter && (
                <div className="stat-meter" title={`${pct}% ${c.meterNote}`}>
                  <i style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="stat-link">
                View <ArrowUpRight size={12} />
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
                  <div key={a._id} className="dash-list-item">
                    <div className="dash-av mini">{((a.name || 'A')[0]).toUpperCase()}</div>
                    <div className="dash-list-meta">
                      <p>{a.name} <span className="dash-program">{a.program}</span></p>
                      <small>{a.intakeTitle || 'Intake'}</small>
                    </div>
                    <span className="dash-status" style={{ color: s.color, background: `${s.color}1a` }}>{s.label}</span>
                  </div>
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
              <Link key={a.to} to={a.to} className="dash-action">
                <span className="dash-action-icon">{a.icon}</span>
                {a.label}
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
          <p className="dash-tip">All figures above are read live from the database.</p>
        </div>
      </div>
    </div>
  );
}
