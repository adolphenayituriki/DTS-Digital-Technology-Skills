import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound, IdCard, Mail, Phone, MapPin, BookOpen, ClipboardList,
  ShieldCheck, FileText, CalendarDays, GraduationCap, Eye, ArrowRight,
} from 'lucide-react';
import apiFetch from '../api';
import useAuth from '../hooks/useAuth';

const STATUS_META = {
  applicant: { label: 'Application Pending Review', color: 'var(--primary)', bg: '#e8f6fd' },
  active: { label: 'Active Student', color: 'var(--success)', bg: '#f0fdf4' },
  rejected: { label: 'Not Selected', color: 'var(--error)', bg: '#fef2f2' },
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function Profile() {
  const { isLoggedIn, ready } = useAuth();
  const [student, setStudent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [authing, setAuthing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ regNumber: '', pin: '' });

  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn) {
      const saved = sessionStorage.getItem('dts_student');
      if (saved) {
        try {
          setStudent(JSON.parse(saved));
          return;
        } catch (err) {
          sessionStorage.removeItem('dts_student');
        }
      }
      setShowForm(true);
      return;
    }
    apiFetch('/students/mine')
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setStudent(d[0]);
        } else {
          setShowForm(true);
        }
      })
      .catch(() => setShowForm(true));
  }, [ready, isLoggedIn]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.regNumber.trim() || !form.pin.trim()) {
      setError('Enter your registration number and PIN.');
      return;
    }
    setAuthing(true);
    try {
      const result = await apiFetch('/students/login', {
        method: 'POST',
        body: JSON.stringify({ regNumber: form.regNumber, pin: form.pin }),
      });
      sessionStorage.setItem('dts_student', JSON.stringify(result));
      setStudent(result);
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Failed to sign in with these credentials.');
    } finally {
      setAuthing(false);
    }
  };

  const meta = student ? STATUS_META[student.status] || STATUS_META.applicant : null;

  const signOut = () => {
    sessionStorage.removeItem('dts_student');
    setStudent(null);
    setShowForm(true);
    setForm({ regNumber: '', pin: '' });
  };

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>Student Profile</h1>
          <p>View your intake, application status, and results</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 780 }}>
          {!student && showForm && (
            <div className="card" style={{ padding: '2rem', maxWidth: 480, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div className="profile-key-icon"><KeyRound size={22} /></div>
                <h3 style={{ margin: '0.75rem 0 0.25rem' }}>Sign in to your DTS Profile</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: 0 }}>
                  Enter the Registration Number and PIN you received by email.
                </p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>DTS Registration Number</label>
                  <div className="profile-input-wrap">
                    <IdCard size={16} />
                    <input
                      className="form-control"
                      value={form.regNumber}
                      onChange={(e) => setForm({ ...form, regNumber: e.target.value })}
                      placeholder="e.g. DTS-2026-0001"
                      autoCapitalize="characters"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>PIN</label>
                  <div className="profile-input-wrap">
                    <KeyRound size={16} />
                    <input
                      className="form-control"
                      type="number"
                      value={form.pin}
                      onChange={(e) => setForm({ ...form, pin: e.target.value })}
                      placeholder="6-digit PIN"
                      maxLength={6}
                    />
                  </div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={authing}>
                  {authing ? 'Verifying...' : 'View My Profile'}
                </button>
              </form>
              {isLoggedIn && (
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '1rem', marginBottom: 0 }}>
                  No student record linked to your account? Use the credentials from your application email.
                </p>
              )}
            </div>
          )}

          {student && meta && (
            <>
              <div className="card profile-head">
                <div className="profile-avatar">{initials(student.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0 }}>{student.name}</h3>
                  <div className="profile-reg">
                    <IdCard size={14} /> {student.regNumber}
                  </div>
                </div>
                <span className="app-status-badge" style={{ color: meta.color, background: meta.bg, alignSelf: 'flex-start' }}>
                  {meta.label}
                </span>
              </div>

              {student.status === 'active' && (
                <div className="alert alert-success profile-status-msg">
                  <ShieldCheck size={18} />
                  <span>Congratulations! You are enrolled as a DTS student in <strong>{student.intakeTitle}</strong>.</span>
                </div>
              )}
              {student.status === 'applicant' && (
                <div className="alert alert-info profile-status-msg">
                  <ClipboardList size={18} />
                  <span>Your application is under review by the DTS admissions team. You will be notified of the outcome by email.</span>
                </div>
              )}
              {student.status === 'rejected' && (
                <div className="alert alert-error profile-status-msg">
                  <FileText size={18} />
                  <span>Your application for {student.intakeTitle} was not selected. We encourage you to apply again for a future intake.</span>
                </div>
              )}

              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Intake Details</h3>
                <div className="profile-grid">
                  <div className="profile-field"><span><GraduationCap size={14} /> Intake</span><b>{student.intakeTitle}</b></div>
                  {student.program && <div className="profile-field"><span><BookOpen size={14} /> Level</span><b>{student.program}</b></div>}
                  <div className="profile-field"><span><Mail size={14} /> Email</span><b>{student.email}</b></div>
                  {student.phone && <div className="profile-field"><span><Phone size={14} /> Phone</span><b>{student.phone}</b></div>}
                  {student.campus && <div className="profile-field"><span><MapPin size={14} /> Campus</span><b>{student.campus}</b></div>}
                  <div className="profile-field"><span><CalendarDays size={14} /> Registered</span><b>{fmtDate(student.createdAt)}</b></div>
                </div>
                {Array.isArray(student.preferredCourses) && student.preferredCourses.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div className="app-detail-label" style={{ marginBottom: '0.5rem' }}><BookOpen size={15} /> Courses</div>
                    <div className="app-detail-courses">
                      {student.preferredCourses.map((c) => (
                        <span key={c} className="intake-course-chip">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Results & Marks</h3>
                {Array.isArray(student.marks) && student.marks.length > 0 ? (
                  <table className="profile-marks">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Score</th>
                        <th>Grade</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.marks.map((m) => (
                        <tr key={m._id}>
                          <td>{m.course}</td>
                          <td>{m.score}%</td>
                          <td>{m.grade || '—'}</td>
                          <td>{m.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-light)' }}>
                    <ClipboardList size={30} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      {student.status === 'active'
                        ? 'No marks recorded yet. Your results will appear here once assessments are complete.'
                        : 'Marks will be shown here once your application is accepted and training begins.'}
                    </p>
                  </div>
                )}
              </div>

              {student.remarks && (
                <div className="card" style={{ padding: '1.25rem 1.5rem', background: '#fffdf5', borderColor: '#f2e9c9' }}>
                  <div className="app-detail-label" style={{ marginBottom: '0.5rem' }}><FileText size={15} /> Note from DTS</div>
                  <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6 }}>{student.remarks}</p>
                </div>
              )}

              <div className="profile-safe">
                <ShieldCheck size={16} />
                <span>Keep your Registration Number and PIN safe — you will use them to access your profile. DTS staff will never ask for your PIN.</span>
              </div>

              {!isLoggedIn && student && (
                <div style={{ textAlign: 'center', marginTop: '0.9rem' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={signOut}>
                    Sign Out
                  </button>
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <Link to="/apply" className="btn btn-outline btn-sm">
                  Apply for Another Intake <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}

          {!student && !showForm && (
            <div className="loading"><div className="spinner" />Loading your profile...</div>
          )}
        </div>
      </section>
    </>
  );
}