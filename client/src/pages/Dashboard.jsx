import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, FileText, ArrowRight, GraduationCap, IdCard, KeyRound, Eye, EyeOff } from 'lucide-react';
import apiFetch from '../api';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';

const statusMap = {
  pending: { label: 'Pending', color: 'var(--warning)' },
  reviewed: { label: 'Reviewed', color: 'var(--primary)' },
  accepted: { label: 'Accepted', color: 'var(--success)' },
  rejected: { label: 'Rejected', color: 'var(--error)' },
};

const studentStatusMap = {
  applicant: { label: 'Applicant', color: 'var(--primary)' },
  active: { label: 'Active Student', color: 'var(--success)' },
  rejected: { label: 'Rejected', color: 'var(--error)' },
};

export default function Dashboard() {
  const { user, isLoggedIn, ready } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    apiFetch('/applications/mine')
      .then((d) => setApplications(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(err.message || 'Could not load your applications.'));
    apiFetch('/students/mine')
      .then((d) => setStudents(Array.isArray(d) ? d : []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [ready, isLoggedIn, navigate, toast]);

  const changePassword = async (e) => {
    e.preventDefault();
    if (!pw.currentPassword || !pw.newPassword) {
      toast.error('Enter your current and new password.');
      return;
    }
    if (pw.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await apiFetch('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
      });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated.');
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setPwSaving(false);
    }
  };

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
          <div className="user-dash-grid">
            <div className="dash-stack">
              <div className="dash-panel">
                <div className="dash-profile-head">
                  <div className="dash-avatar">
                    {(user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3>{user?.name}</h3>
                    <p>{user?.email}</p>
                  </div>
                </div>
              </div>

              {students.length > 0 && (
                <div className="dash-panel dash-id-card">
                  <div className="dash-id-row">
                    <span className="dash-id-icon"><GraduationCap size={17} /></span>
                    <span>
                      <div className="dash-id-eyebrow">DTS Student</div>
                      <b className="dash-id-reg">{students[0].regNumber}</b>
                    </span>
                  </div>
                  <div className="dash-id-meta">
                    <span className="dash-id-intake">{students[0].intakeTitle}</span>
                    <span className="dash-status" style={{ color: '#7dd3fc', background: 'rgba(125,211,252,0.15)' }}>
                      {(studentStatusMap[students[0].status] || studentStatusMap.applicant).label}
                    </span>
                  </div>
                  <Link to="/profile" className="dash-id-cta">
                    <IdCard size={14} /> View My Student Profile
                  </Link>
                </div>
              )}

              <div className="dash-panel">
                <div className="dash-panel-head">
                  <h3>Quick Actions</h3>
                </div>
                <div className="dash-actions">
                  <Link to="/apply" className="dash-action">
                    <span className="dash-action-icon"><ClipboardList size={15} /></span>
                    Apply for an Intake
                    <ArrowRight size={15} />
                  </Link>
                  <Link to="/programs" className="dash-action">
                    <span className="dash-action-icon"><FileText size={15} /></span>
                    Browse Programs
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-form-title">
                  <KeyRound size={15} /> Change Password
                </div>
                <form onSubmit={changePassword} className="dash-pw-grid">
                  <div className="form-group">
                    <label>Current password</label>
                    <input
                      className="form-control"
                      type={showPw ? 'text' : 'password'}
                      value={pw.currentPassword}
                      onChange={(e) => setPw((c) => ({ ...c, currentPassword: e.target.value }))}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="form-group">
                    <label>New password</label>
                    <input
                      className="form-control"
                      type={showPw ? 'text' : 'password'}
                      value={pw.newPassword}
                      onChange={(e) => setPw((c) => ({ ...c, newPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm new password</label>
                    <input
                      className="form-control"
                      type={showPw ? 'text' : 'password'}
                      value={pw.confirm}
                      onChange={(e) => setPw((c) => ({ ...c, confirm: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="dash-pw-actions">
                    <button className="btn btn-primary btn-sm" type="submit" disabled={pwSaving}>
                      {pwSaving ? 'Saving...' : 'Update Password'}
                    </button>
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide passwords' : 'Show passwords'}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-head">
                <h3>My Applications</h3>
                <div className="dash-counts">
                  {accepted > 0 && <span className="dash-count-chip dash-count-ok">{accepted} accepted</span>}
                  {pending > 0 && <span className="dash-count-chip dash-count-wait">{pending} pending</span>}
                </div>
              </div>

              {loading ? (
                <div className="loading"><div className="spinner" />Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="dash-empty">
                  <ClipboardList size={30} style={{ opacity: 0.35 }} />
                  <p>You haven't applied for any intake yet.</p>
                  <Link to="/apply" className="btn btn-primary btn-sm">Apply Now</Link>
                </div>
              ) : (
                <div>
                  {applications.map((app) => {
                    const st = statusMap[app.status] || statusMap.pending;
                    return (
                      <div key={app._id} className="dash-app-item">
                        <div>
                          <div className="dash-app-title">
                            <b>{app.intakeTitle}</b>
                            <span className="dash-status" style={{ color: st.color, background: `${st.color}18` }}>
                              {st.label}
                            </span>
                          </div>
                          <div className="dash-app-sub">
                            {app.program && <span><FileText size={13} /> {app.program}</span>}
                            <span>
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