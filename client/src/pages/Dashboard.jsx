import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, FileText, ArrowRight } from 'lucide-react';
import apiFetch from '../api';
import useAuth from '../hooks/useAuth';

const statusMap = {
  pending: { label: 'Pending', color: 'var(--warning)' },
  reviewed: { label: 'Reviewed', color: 'var(--primary)' },
  accepted: { label: 'Accepted', color: 'var(--success)' },
  rejected: { label: 'Rejected', color: 'var(--error)' },
};

export default function Dashboard() {
  const { user, isLoggedIn, ready } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    apiFetch('/applications/mine')
      .then((d) => setApplications(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, isLoggedIn, navigate]);

  if (!ready || !isLoggedIn) {
    return <div className="loading"><div className="spinner" />Loading...</div>;
  }

  const accepted = applications.filter((a) => a.status === 'accepted').length;
  const pending = applications.filter((a) => a.status === 'pending').length;

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>My Dashboard</h1>
          <p>Track your applications and training progress</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div>
              <div className="card mb-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="dash-avatar">
                    {(user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{user?.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Quick Actions</h3>
                <Link to="/apply" className="btn btn-primary btn-sm" style={{ marginBottom: '0.75rem', width: '100%', justifyContent: 'center' }}>
                  Apply for an Intake <ArrowRight size={15} />
                </Link>
                <Link to="/programs" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  Browse Programs
                </Link>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem' }}>My Applications</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  {accepted > 0 && <span style={{ marginRight: '0.75rem' }}>{accepted} accepted</span>}
                  {pending > 0 && <span>{pending} pending</span>}
                </span>
              </div>

              {loading ? (
                <div className="loading"><div className="spinner" />Loading applications...</div>
              ) : applications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <ClipboardList size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>You haven't applied for any intake yet.</p>
                  <Link to="/apply" className="btn btn-primary btn-sm">Apply Now</Link>
                </div>
              ) : (
                <div>
                  {applications.map((app) => {
                    const st = statusMap[app.status] || statusMap.pending;
                    return (
                      <div key={app._id} className="dash-app-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <b style={{ fontSize: '0.92rem' }}>{app.intakeTitle}</b>
                            <span className="dash-status" style={{ color: st.color, background: `${st.color}18` }}>
                              {st.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-light)', flexWrap: 'wrap' }}>
                            {app.program && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><FileText size={13} /> {app.program}</span>}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Calendar size={13} /> Submitted {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}