import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Users, FileText, Calendar, ClipboardList,
  ArrowUpRight, PlusCircle, ArrowRight, Inbox,
} from 'lucide-react';
import apiFetch from '../../api';

const statusMap = {
  pending: { label: 'Pending', color: 'var(--warning)' },
  reviewed: { label: 'Reviewed', color: 'var(--primary)' },
  accepted: { label: 'Accepted', color: 'var(--success)' },
  rejected: { label: 'Rejected', color: 'var(--error)' },
};

const cards = [
  { label: 'Total Messages', key: 'messages', icon: <MessageSquare size={22} />, tone: 'sky', to: '/admin/messages' },
  { label: 'Total Members', key: 'members', icon: <Users size={22} />, tone: 'green', to: '/admin/members' },
  { label: 'Total Posts', key: 'posts', icon: <FileText size={22} />, tone: 'blue', to: '/admin/posts' },
  { label: 'Open Intakes', key: 'intakes', icon: <Calendar size={22} />, tone: 'amber', to: '/admin/intakes' },
  { label: 'Applications', key: 'applications', icon: <ClipboardList size={22} />, tone: 'violet', to: '/admin/applications' },
];

const quickActions = [
  { label: 'Create New Post', to: '/admin/posts', icon: <PlusCircle size={17} /> },
  { label: 'Review Applications', to: '/admin/applications', icon: <ClipboardList size={17} /> },
  { label: 'Manage Intakes', to: '/admin/intakes', icon: <Calendar size={17} /> },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ messages: 0, members: 0, posts: 0, intakes: 0, applications: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/messages').then((d) => (Array.isArray(d) ? d.length : 0)).catch(() => 0),
      apiFetch('/members').then((d) => (Array.isArray(d) ? d.length : 0)).catch(() => 0),
      apiFetch('/posts').then((d) => (Array.isArray(d) ? d.length : 0)).catch(() => 0),
      apiFetch('/intakes/all').then((d) => (Array.isArray(d) ? d.length : 0)).catch(() => 0),
      apiFetch('/applications').then((d) => {
        if (!Array.isArray(d)) return 0;
        const sorted = [...d].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setRecent(sorted.slice(0, 5));
        return d.length;
      }).catch(() => 0),
    ])
      .then(([messages, members, posts, intakes, applications]) =>
        setStats({ messages, members, posts, intakes, applications })
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading dashboard...</div>;

  return (
    <div className="admin-dash">
      <div className="admin-dash-grid">
        {cards.map((c) => (
          <Link key={c.key} to={c.to} className={`stat-card tone-${c.tone}`}>
            <div className="stat-top">
              <div className="stat-value">{stats[c.key]}</div>
              <div className="stat-chip">{c.icon}</div>
            </div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-link">
              View <ArrowUpRight size={13} />
            </div>
          </Link>
        ))}
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
                      <small>{a.intakeTitle || a.intake?.title || 'Intake'}</small>
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
          <p className="dash-tip">Manage content, intakes, and applications from one place.</p>
        </div>
      </div>
    </div>
  );
}