import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound, IdCard, Mail, Phone, MapPin, BookOpen, ClipboardList,
  ShieldCheck, FileText, CalendarDays, GraduationCap, Eye, ArrowRight, ArrowLeft,
  CreditCard, AlertCircle, CheckCircle2, Clock, Receipt, Award, Download, ShieldAlert,
} from 'lucide-react';
import apiFetch, { setStudentSession, clearStudentSession, getStudentSession } from '../api';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import Avatar from '../components/Avatar';
import AchievementCardModal from '../components/AchievementCard';
import ChangePinForm from '../components/ChangePinForm';

const STATUS_META = {
  applicant: { label: 'Application Pending Review', color: 'var(--primary)', bg: '#e8f6fd' },
  active: { label: 'Active Student', color: 'var(--success)', bg: '#f0fdf4' },
  rejected: { label: 'Not Selected', color: 'var(--error)', bg: '#fef2f2' },
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const money = (value, currency = 'RWF') =>
  `${Number(value || 0).toLocaleString('en-RW')} ${currency || 'RWF'}`;

const paymentProgress = (payment) => {
  if (!payment || Number(payment.expected || 0) === 0) return { pct: 0, label: 'No fee configured' };
  const pct = Math.min(100, Math.round((Number(payment.paid || 0) / Number(payment.expected)) * 100));
  return { pct, label: `${pct}% paid` };
};

// A zero expected fee must never read as "Paid in Full".
const paymentBadge = (payment) => {
  const expected = Number(payment?.expected || 0);
  const paid = Number(payment?.paid || 0);
  const balance = Number(payment?.balance || 0);
  if (expected === 0) return { label: 'No Fee Configured', tone: 'neutral', icon: <Clock size={14} /> };
  if (balance <= 0) return { label: 'Paid in Full', tone: 'paid', icon: <CheckCircle2 size={14} /> };
  if (paid > 0) return { label: 'Partial Payment', tone: 'partial', icon: <AlertCircle size={14} /> };
  return { label: 'Unpaid', tone: 'unpaid', icon: <AlertCircle size={14} /> };
};

const BADGE_STYLES = {
  paid: { background: '#f0fdf4', color: '#166534' },
  partial: { background: '#fff7ed', color: '#c2410c' },
  unpaid: { background: '#fef2f2', color: '#991b1b' },
  neutral: { background: '#f1f5f9', color: '#475569' },
};

export default function Profile() {
  const { isLoggedIn, ready } = useAuth();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [payment, setPayment] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [authing, setAuthing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ regNumber: '', pin: '' });
  const [showForgot, setShowForgot] = useState(false);
  const [forgot, setForgot] = useState({ regNumber: '', email: '' });
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotOk, setForgotOk] = useState(false);
  const [cardMark, setCardMark] = useState(null);

  // Only courses staff explicitly ticked as completed earn a card.
  const completedMarks = Array.isArray(student?.marks)
    ? student.marks.filter((m) => m.completed)
    : [];

  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn) {
      const saved = getStudentSession();
      if (saved) {
        setStudent(saved);
        return;
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

  // Re-read the record whenever a session exists. PIN sign-in caches the
  // student locally, so without this a course marked complete by staff would
  // not show up (and the achievement card would stay hidden) until the student
  // signed in again. The cache is only a fallback for when the request fails.
  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn && !getStudentSession()) return;
    let active = true;
    apiFetch('/students/mine/profile')
      .then((fresh) => { if (active && fresh) setStudent(fresh); })
      .catch(() => { /* keep the cached copy */ });
    return () => { active = false; };
  }, [ready, isLoggedIn]);

  useEffect(() => {
    if (!student) return;
    setPaymentLoading(true);
    apiFetch('/finance/student/me')
      .then((data) => {
        setPayment(data);
      })
      .catch((err) => {
        setPayment(null);
        if (err.status !== 404) {
          toast.error(err.message || 'Could not load your payment summary.');
        }
      })
      .finally(() => setPaymentLoading(false));
  }, [student, toast]);

  useEffect(() => {
    if (!student) return undefined;
    let active = true;
    apiFetch('/students/mine/attendance')
      .then((data) => { if (active) setAttendance(data); })
      .catch(() => { if (active) setAttendance(null); });
    return () => { active = false; };
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.regNumber.trim() || !form.pin.trim()) {
      setError('Enter your registration number and PIN.');
      toast.error('Enter your registration number and PIN.');
      return;
    }
    setAuthing(true);
    try {
      const result = await apiFetch('/students/login', {
        method: 'POST',
        body: JSON.stringify({ regNumber: form.regNumber, pin: form.pin }),
      });
      setStudentSession(result);
      setStudent(getStudentSession());
      setShowForm(false);
      toast.success(`Welcome back, ${result.name}.`);
    } catch (err) {
      setError(err.message || 'Failed to sign in with these credentials.');
      toast.error(err.message || 'Failed to sign in with these credentials.');
    } finally {
      setAuthing(false);
    }
  };

  const handleForgotPin = async (e) => {
    e.preventDefault();
    setForgotMsg('');
    if (!forgot.regNumber.trim() || !forgot.email.trim()) {
      setForgotOk(false);
      setForgotMsg('Enter your registration number and email.');
      toast.error('Enter your registration number and email.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await apiFetch('/students/forgot-pin', {
        method: 'POST',
        body: JSON.stringify(forgot),
      });
      setForgotOk(true);
      setForgotMsg(res.message || 'A new PIN has been sent if the details match.');
      toast.success('If those details match, a new PIN is on its way to your email.');
    } catch (err) {
      setForgotOk(false);
      setForgotMsg(err.message || 'Something went wrong. Please try again.');
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const meta = student ? STATUS_META[student.status] || STATUS_META.applicant : null;

  // At-a-glance figures for the overview. Each tile is only rendered when the
  // underlying data actually exists, so the summary never shows a fake zero.
  const totalMarks = Array.isArray(student?.marks) ? student.marks.length : 0;
  const paymentStat = payment ? paymentBadge(payment) : null;
  const summaryTiles = [
    totalMarks > 0 && {
      key: 'courses',
      icon: <BookOpen size={16} />,
      label: 'Courses',
      value: `${completedMarks.length}/${totalMarks}`,
      note: completedMarks.length === totalMarks ? 'all completed' : 'completed',
    },
    payment && {
      key: 'payment',
      icon: <CreditCard size={16} />,
      label: 'Fees',
      value: money(payment.balance, payment.currency || 'RWF'),
      note: paymentStat?.label,
      tone: Number(payment.balance || 0) > 0 ? 'warn' : 'ok',
    },
    attendance && attendance.total > 0 && {
      key: 'attendance',
      icon: <CalendarDays size={16} />,
      label: 'Attendance',
      value: `${attendance.rate}%`,
      note: `${attendance.present}/${attendance.total} sessions`,
      tone: attendance.rate >= 75 ? 'ok' : 'warn',
    },
    student?.campus && {
      key: 'campus',
      icon: <MapPin size={16} />,
      label: 'Campus',
      value: student.campus,
      note: student.program || null,
    },
  ].filter(Boolean);

  // One clear line explaining what is happening, instead of the same status
  // being shown twice in a badge and a banner.
  const statusMessage = {
    active: `Congratulations! You are enrolled as a DTS student in ${student?.intakeTitle}.`,
    applicant: 'Your application is under review by the DTS admissions team. You will be notified of the outcome by email.',
    rejected: `Your application for ${student?.intakeTitle} was not selected. We encourage you to apply again for a future intake.`,
  }[student?.status];

  const StatusIcon = {
    active: <ShieldCheck size={18} />,
    applicant: <ClipboardList size={18} />,
    rejected: <FileText size={18} />,
  }[student?.status] || null;

  // Anchor list for the jump bar. An entry is only added when the panel it
  // points at will actually render, so it never links to a dead target. The
  // figures themselves live in the stat row, so no counts are repeated here.
  const navItems = [
    { id: 'profile-overview', label: 'Overview', icon: <ClipboardList size={15} /> },
    (payment || paymentLoading) && { id: 'profile-fees', label: 'Payment', icon: <CreditCard size={15} /> },
    student?.status === 'active' && { id: 'profile-attendance', label: 'Attendance', icon: <CalendarDays size={15} /> },
    totalMarks > 0 && { id: 'profile-results', label: 'Results', icon: <ClipboardList size={15} /> },
    completedMarks.length > 0 && { id: 'profile-achievements', label: 'Achievements', icon: <Award size={15} /> },
    { id: 'profile-security', label: 'Security', icon: <KeyRound size={15} /> },
    student?.remarks && { id: 'profile-note', label: 'Note from DTS', icon: <FileText size={15} /> },
  ].filter(Boolean);

  const signOut = () => {
    clearStudentSession();
    setStudent(null);
    setPayment(null);
    setShowForm(true);
    setForm({ regNumber: '', pin: '' });
  };

  return (
    <>
      <section className="page-header page-header-compact">
        <div className="container">
          <h1>Student Profile</h1>
          <p>View your intake, application status, and results</p>
        </div>
      </section>

      <section className="section section-compact">
        <div className="container profile-shell">
          {!student && showForm && (
            <div className="card profile-auth">
              <div className="profile-auth-head">
                <div className="profile-key-icon"><KeyRound size={22} /></div>
                <h3>Sign in to your DTS Profile</h3>
                <p>
                  Enter the Registration Number and PIN you received by email.
                </p>
              </div>
              {showForgot ? (
                <form onSubmit={handleForgotPin}>
                  <p className="profile-note-text">
                    Forgot your PIN? Enter the Registration Number and the email you applied with — we'll email you a new PIN.
                  </p>
                  <div className="form-group">
                    <label>UR Registration Number</label>
                    <div className="profile-input-wrap">
                      <IdCard size={16} />
                      <input
                        className="form-control"
                        value={forgot.regNumber}
                        onChange={(e) => setForgot({ ...forgot, regNumber: e.target.value })}
                        placeholder="e.g. 225020019"
                        autoCapitalize="characters"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Application Email</label>
                    <div className="profile-input-wrap">
                      <Mail size={16} />
                      <input
                        className="form-control"
                        type="email"
                        value={forgot.email}
                        onChange={(e) => setForgot({ ...forgot, email: e.target.value })}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  {forgotMsg && (
                    <div className={forgotOk ? 'alert alert-info' : 'alert alert-error'}>{forgotMsg}</div>
                  )}
                  <button type="submit" className="btn btn-primary profile-block-btn" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending...' : 'Send New PIN'}
                  </button>
                  <button
                    type="button"
                    className="auth-btn-link profile-forgot"
                    onClick={() => { setShowForgot(false); setForgotMsg(''); }}
                  >
                    <ArrowLeft size={13} /> Back to sign in
                  </button>
                </form>
              ) : (
                <>
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>UR Registration Number</label>
                      <div className="profile-input-wrap">
                        <IdCard size={16} />
                        <input
                          className="form-control"
                          value={form.regNumber}
                          onChange={(e) => setForm({ ...form, regNumber: e.target.value })}
                          placeholder="e.g. 225020019"
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
                    <button type="submit" className="btn btn-primary profile-block-btn" disabled={authing}>
                      {authing ? 'Verifying...' : 'View My Profile'}
                    </button>
                    <button
                      type="button"
                      className="auth-forgot-link profile-forgot"
                      onClick={() => { setShowForgot(true); setError(''); }}
                    >
                      Forgot your PIN?
                    </button>
                  </form>
                  {isLoggedIn && (
                    <p className="profile-note-text is-centered">
                      No student record linked to your account? Use the credentials from your application email.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {!student && !showForm && (
            <div className="loading"><div className="spinner" />Loading your profile...</div>
          )}

          {student && meta && (
            <div className="profile-dash">
              {/* One compact strip: identity, section jumps and the two actions.
                  This replaces the tall left rail, which cost about as much
                  vertical space as the content it was meant to organise. */}
              <section className="card profile-hero">
                <div className="profile-hero-id">
                  <Avatar size="lg" name={student.name} />
                  <div className="profile-hero-text">
                    <h2>{student.name}</h2>
                    <div className="profile-reg"><IdCard size={13} /> {student.regNumber}</div>
                  </div>
                  <span
                    className="app-status-badge"
                    style={{ color: meta.color, background: meta.bg }}
                  >
                    {meta.label}
                  </span>
                </div>

                <nav className="profile-jump" aria-label="Profile sections">
                  {navItems.map((item) => (
                    <a key={item.id} href={`#${item.id}`}>
                      {item.icon}
                      <span>{item.label}</span>
                    </a>
                  ))}
                </nav>

                <div className="profile-hero-actions">
                  {!isLoggedIn && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={signOut}>
                      Sign Out
                    </button>
                  )}
                  <Link to="/apply" className="btn btn-outline btn-sm">
                    Apply for Another Intake <ArrowRight size={14} />
                  </Link>
                </div>
              </section>

              {statusMessage && (
                <div className={`profile-banner is-${student.status}`}>
                  {StatusIcon}
                  <p>{statusMessage}</p>
                </div>
              )}

              {summaryTiles.length > 0 && (
                <div className="profile-summary" id="profile-overview">
                  {summaryTiles.map((t) => (
                    <div key={t.key} className={`profile-summary-tile${t.tone ? ` is-${t.tone}` : ''}`}>
                      <div className="profile-summary-label">{t.icon}{t.label}</div>
                      <div className="profile-summary-line">
                        <span className="profile-summary-value">{t.value}</span>
                        {t.note && <span className="profile-summary-note">{t.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="profile-cols is-3">
                <section className="card profile-card" id="profile-intake">
                  <h3 className="profile-card-title"><GraduationCap size={14} /> Intake Details</h3>
                  <div className="profile-grid">
                    <div className="profile-field"><span><GraduationCap size={13} /> Intake</span><b>{student.intakeTitle}</b></div>
                    {student.program && <div className="profile-field"><span><BookOpen size={13} /> Level</span><b>{student.program}</b></div>}
                    <div className="profile-field"><span><Mail size={13} /> Email</span><b>{student.email}</b></div>
                    {student.phone && <div className="profile-field"><span><Phone size={13} /> Phone</span><b>{student.phone}</b></div>}
                    {student.campus && <div className="profile-field"><span><MapPin size={13} /> Campus</span><b>{student.campus}</b></div>}
                    <div className="profile-field"><span><CalendarDays size={13} /> Registered</span><b>{fmtDate(student.createdAt)}</b></div>
                  </div>
                  {Array.isArray(student.preferredCourses) && student.preferredCourses.length > 0 && (
                      <div className="profile-section">
                        <div className="app-detail-label"><BookOpen size={13} /> Courses</div>
                        <div className="app-detail-courses">
                          {student.preferredCourses.map((c) => (
                                <span key={c} className="intake-course-chip">{c}</span>
                          ))}
                        </div>
                      </div>
                  )}
                </section>

                {payment && (() => {
                      const currency = payment.currency || 'RWF';
                      const badge = paymentBadge(payment);
                      const hasFee = Number(payment.expected || 0) > 0;
                      return (
                        <section className="card profile-card" id="profile-fees">
                          <div className="profile-card-head">
                            <h3 className="profile-card-title"><CreditCard size={15} /> Payment Status</h3>
                            {paymentLoading && <span className="profile-hint">Updating...</span>}
                          </div>
                          {hasFee && (
                              <div className="profile-block">
                                <div className="profile-meter-row">
                                  <span className="muted">Payment Progress</span>
                                  <b>{paymentProgress(payment).label}</b>
                                </div>
                                <div className={`profile-meter${Number(payment.balance || 0) <= 0 ? ' is-paid' : ''}`}>
                                  <i style={{ width: `${paymentProgress(payment).pct}%` }} />
                                </div>
                              </div>
                          )}
                          <div className="payment-summary">
                            <div className="payment-stat">
                              <div className="payment-stat-label">Required Fee</div>
                              <div className="payment-stat-value">{money(payment.expected, currency)}</div>
                            </div>
                            <div className="payment-stat">
                              <div className="payment-stat-label">Amount Paid</div>
                              <div className="payment-stat-value" style={{ color: 'var(--success)' }}>{money(payment.paid, currency)}</div>
                            </div>
                            <div className="payment-stat">
                              <div className="payment-stat-label">Balance</div>
                              <div className="payment-stat-value" style={{ color: Number(payment.balance || 0) > 0 ? 'var(--error)' : 'var(--success)' }}>{money(payment.balance, currency)}</div>
                            </div>
                          </div>
                          <div className="profile-payment-foot">
                            <span
                            className="payment-status-badge"
                            style={{ ...BADGE_STYLES[badge.tone] }}
                            >
                            {badge.icon}
                            {badge.label}
                          </span>
                          {payment.intakeTitle && (
                              <span className="profile-sub is-inline">For: {payment.intakeTitle}</span>
                          )}
                        </div>
                        {Array.isArray(payment.payments) && payment.payments.length > 0 && (
                            <div className="profile-section">
                              <div className="app-detail-label"><Receipt size={13} /> Payment History</div>
                              <div className="profile-history">
                                {payment.payments.map((p, i) => (
                                      <div key={`${p.occurredAt}-${i}`} className="profile-history-row">
                                        <span className="muted">{fmtDate(p.occurredAt)}</span>
                                        <b>{money(p.amount, p.currency || currency)}</b>
                                      </div>
                                ))}
                              </div>
                            </div>
                        )}
                      </section>
                    );
                })()}

              {paymentLoading && !payment && (
                  <section className="card profile-card">
                    <div className="loading"><div className="spinner" />Loading payment status...</div>
                  </section>
              )}

              {student.status === 'active' && (
                  <section className="card profile-card" id="profile-attendance">
                    <div className="profile-card-head">
                      <h3 className="profile-card-title"><CalendarDays size={14} /> Attendance</h3>
                      <span className="profile-hint">
                        {attendance && attendance.total > 0 ? `${attendance.total} sessions` : 'No sessions yet'}
                      </span>
                    </div>
                    {!attendance || attendance.total === 0 ? (
                        <div className="profile-empty is-inline">
                          <CalendarDays size={18} style={{ opacity: 0.4 }} />
                          <p>No attendance has been recorded yet.</p>
                        </div>
                      ) : (
                        <>
                        <div className="attendance-summary">
                          <div className="attendance-stat present">
                            <div className="attendance-stat-value">{attendance.present}</div>
                            <div className="attendance-stat-label">Present</div>
                          </div>
                          <div className="attendance-stat absent">
                            <div className="attendance-stat-value">{attendance.absent}</div>
                            <div className="attendance-stat-label">Absent</div>
                          </div>
                          <div className="attendance-stat late">
                            <div className="attendance-stat-value">{attendance.late}</div>
                            <div className="attendance-stat-label">Late</div>
                          </div>
                        </div>
                        <div className="profile-block">
                          <div className="profile-meter-row">
                            <span className="muted">Attendance rate</span>
                            <b>{attendance.rate}%</b>
                          </div>
                          <div className={`profile-meter${attendance.rate >= 75 ? ' is-paid' : ''}`}>
                            <i style={{ width: `${Math.min(100, Math.max(0, attendance.rate))}%` }} />
                          </div>
                        </div>
                        </>
                    )}

                    {/* Sessions sit inside the attendance card: same data
                      source, and folding them in removes a page row. */}
                    {attendance && attendance.records.length > 0 && (
                        <div className="profile-section" id="profile-sessions">
                          <div className="app-detail-label"><Clock size={13} /> Recent Sessions</div>
                          <div className="upcoming-sessions">
                            {attendance.records.map((r) => (
                                  <div key={r.id} className="upcoming-session">
                                    <div className="upcoming-day">
                                      <span>{fmtDate(r.sessionDate).slice(0, 3)}</span>
                                      <span className="profile-hint">{new Date(r.sessionDate).getDate()}</span>
                                    </div>
                                    <div className="upcoming-session-body">
                                      <div className="upcoming-session-title">{r.course || 'Session'}</div>
                                      <div className="upcoming-session-meta">
                                        {fmtDate(r.sessionDate)}{r.note ? ` · ${r.note}` : ''}
                                      </div>
                                    </div>
                                    <span className={`finance-status status-${r.status === 'present' ? 'paid' : r.status === 'absent' ? 'unpaid' : 'pending'}`}>
                                      {r.status}
                                    </span>
                                  </div>
                            ))}
                          </div>
                        </div>
                    )}
                  </section>
              )}
              </div>

              <div className="profile-cols is-2">
                <section className="card profile-card" id="profile-results">
                  <h3 className="profile-card-title"><ClipboardList size={14} /> Results &amp; Marks</h3>
                  {Array.isArray(student.marks) && student.marks.length > 0 ? (
                      <div className="profile-marks-wrap">
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
                      </div>
                    ) : (
                      <div className="profile-empty is-inline">
                        <ClipboardList size={18} style={{ opacity: 0.4 }} />
                        <p>
                          {student.status === 'active'
                            ? 'No marks recorded yet.'
                            : 'Marks appear once your application is accepted.'}
                        </p>
                      </div>
                  )}
                </section>

                {completedMarks.length > 0 && (
                    <section className="card profile-card" id="profile-achievements">
                      <div className="profile-card-head">
                        <h3 className="profile-card-title"><Award size={14} /> Your Achievements</h3>
                        <span
                        className="profile-hint"
                        title="A celebratory keepsake card, not a formal certificate."
                        >
                        {completedMarks.length} completed
                      </span>
                    </div>
                    <div className="profile-achievements">
                      {completedMarks.map((m) => (
                            <div key={m._id} className="profile-achievement">
                              <div className="profile-achievement-icon"><Award size={14} /></div>
                              <div className="profile-achievement-body">
                                <b>{m.course}</b>
                                <span className="muted">
                                  {m.score != null ? `${m.score}%` : null}
                                  {m.score != null && m.grade ? ' · ' : ''}
                                  {m.grade || null}
                                  {m.completedAt ? ` · ${fmtDate(m.completedAt)}` : ''}
                                </span>
                              </div>
                              <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setCardMark(m)}
                              >
                              <Download size={13} /> Card
                            </button>
                          </div>
                    ))}
                  </div>
                </section>
              )}
              </div>

              {student.remarks && (
                  <section className="card profile-card profile-note is-inline" id="profile-note">
                    <div className="app-detail-label"><FileText size={13} /> Note from DTS</div>
                    <p>{student.remarks}</p>
                  </section>
              )}

              {/* Security lives on the profile rather than behind a link so the
                  PIN a student was emailed by DTS is theirs to replace without
                  having to email anyone. */}
              <section id="profile-security">
                {student.mustChangePin && (
                  <div className="alert alert-error profile-pin-alert">
                    <ShieldAlert size={18} />
                    <p>
                      <b>Choose your own PIN.</b> The one you were sent by email is temporary and
                      only works until you replace it.
                    </p>
                  </div>
                )}
                <ChangePinForm onChanged={(fresh) => fresh && setStudent(fresh)} />
              </section>

              <div className="profile-safe is-inline">
                <ShieldCheck size={14} />
                <span>Keep your Registration Number and PIN safe — DTS staff will never ask for your PIN.</span>
              </div>
              </div>
              )}
              </div>
              </section>

              {cardMark && (
                  <AchievementCardModal
                  student={student}
                  mark={cardMark}
                  intakeTitle={student?.intakeTitle}
                  onClose={() => setCardMark(null)}
                  />
              )}
    </>
  );
}
