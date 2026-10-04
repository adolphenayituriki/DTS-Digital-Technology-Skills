import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound, IdCard, Mail, Phone, MapPin, BookOpen, ClipboardList,
  ShieldCheck, FileText, CalendarDays, GraduationCap, ArrowRight, ArrowLeft,
  CreditCard, AlertCircle, CheckCircle2, Clock, Receipt, Award, Download, ShieldAlert,
  LayoutDashboard, ChartNoAxesColumn, MonitorPlay, Lock, Camera,
} from 'lucide-react';
import apiFetch, { setStudentSession, clearStudentSession, getStudentSession } from '../api';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import Avatar from '../components/Avatar';
import CertificateModal from '../components/Certificate';
import ChangePinForm from '../components/ChangePinForm';
import { resizeImageForUpload } from '../utils/imageResize';

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

// A completed course is not enough to release the card: the fee has to be
// settled too, otherwise a student can finish the training and walk away with
// a certificate for a course they never paid for.
//
// An intake with no tuition fee configured is deliberately NOT locked. A zero
// fee means the institution never set a charge, so holding the card hostage
// over an amount nobody defined would be a dead end the student cannot fix.
const cardIsUnlocked = (payment) => {
  if (!payment) return false;
  if (Number(payment.expected || 0) === 0) return true;
  return Number(payment.balance || 0) <= 0;
};

// Shared "nothing here yet" block, so an empty section reads as a deliberate
// answer rather than a panel that failed to load.
const EmptyNote = ({ icon, children }) => (
  <div className="profile-empty is-block">
    {icon}
    <p>{children}</p>
  </div>
);

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
  const [showCertificate, setShowCertificate] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Only courses staff explicitly ticked as completed count towards the
  // certificate. There is ONE certificate per programme, so what matters is
  // whether every course is done, not how many.
  //
  // Completion is read from `completedCourses`, which a trainer signs off per
  // course. It used to be counted from `marks[].completed` instead, which meant
  // a course could only ever be completed if it happened to have an assessment
  // recorded against it - a course taught without an exam could never finish,
  // and a single mark stood in for a whole course.
  const programmeCourses = Array.isArray(student?.preferredCourses) && student.preferredCourses.length
    ? student.preferredCourses
    : String(student?.program || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
  const completedCourseKeys = new Set(
    (Array.isArray(student?.completedCourses) ? student.completedCourses : []).map((entry) =>
      String(entry.course || '').trim().toLowerCase()
    )
  );
  const totalMarks = programmeCourses.length;
  const completedMarks = programmeCourses.filter((course) =>
    completedCourseKeys.has(String(course).trim().toLowerCase())
  );
  const allCoursesCompleted = totalMarks > 0 && completedMarks.length === totalMarks;

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

  // Uploads a new profile photo for the signed-in student.
  //
  // Resized on the device first, for the same reason as the staff profile: this
  // renders at 96px, so uploading a multi-megabyte phone photo would spend the
  // student's data on bytes nobody sees.
  const handlePhotoChange = async (event) => {
    const chosen = event.target.files?.[0];
    // Cleared immediately so picking the same file twice still fires a change.
    event.target.value = '';
    if (!chosen) return;
    if (!chosen.type.startsWith('image/')) {
      toast.error('That file is not an image. Choose a photo from your gallery.');
      return;
    }
    setPhotoUploading(true);
    try {
      const file = await resizeImageForUpload(chosen);
      const body = new FormData();
      body.append('file', file);
      const saved = await apiFetch('/students/mine/photo', { method: 'POST', body });
      setStudent(saved);
      toast.success('Profile photo updated.');
    } catch (error) {
      toast.error(error.message || 'Could not upload that photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

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
      // The sign-in form is replaced in place by the board, so the applicant
      // would otherwise be left looking at the offset the form was scrolled to,
      // with the status banner - the one line that answers "did this work?" -
      // still above the fold.
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const paymentStat = payment ? paymentBadge(payment) : null;
  // Course appreciation card is shown when courses are completed; fee is no longer required
  const feeSettled = true;
  const certificateReady = allCoursesCompleted;
  // Hoisted to the component body: the payment panel and the achievement panel
  // both need it, and it was previously declared inside the payment panel's
  // IIFE where nothing else could reach it.
  const currency = payment?.currency || 'RWF';
  const summaryTiles = [
    totalMarks > 0 && {
      key: 'courses',
      icon: <BookOpen size={16} />,
      label: 'Courses',
      value: `${completedMarks.length}/${totalMarks}`,
      note: completedMarks.length === totalMarks ? 'all completed' : 'completed',
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
    student?.program && {
      key: 'program',
      icon: <GraduationCap size={16} />,
      label: 'Program',
      value: student.program,
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

  // The rail is the map of the page, built from the same data the panels render
  // from. A section stays in the rail even when it is still empty - the student
  // needs somewhere to read "no marks yet" - and it is only dropped when the
  // section is genuinely meaningless for them. Each entry carries the figure
  // that section leads with, so the rail doubles as a summary and shows where
  // their attention is needed.
  const navItems = [
    {
      id: 'profile-overview', group: 'Summary', label: 'Overview',
      icon: <LayoutDashboard size={15} />,
    },
    {
      id: 'profile-intake', group: 'Academics', label: 'Intake Details',
      icon: <GraduationCap size={15} />,
    },
    {
      id: 'profile-attendance', group: 'Academics', label: 'Attendance',
      icon: <CalendarDays size={15} />,
      badge: attendance?.total > 0 ? `${attendance.rate}%` : null,
      tone: attendance?.total > 0 ? (attendance.rate >= 75 ? 'ok' : 'warn') : null,
      show: student?.status === 'active',
    },
    {
      id: 'profile-results', group: 'Academics', label: 'Results & Marks',
      icon: <ChartNoAxesColumn size={15} />,
      badge: totalMarks,
    },
    {
      id: 'profile-achievements', group: 'Academics', label: 'Course Appreciation',
      icon: <Award size={15} />,
      badge: certificateReady ? 'Ready' : null,
      tone: certificateReady ? 'paid' : null,
    },
    {
      id: 'profile-note', group: 'Account', label: 'Note from DTS',
      icon: <FileText size={15} />,
      show: Boolean(student?.remarks),
    },
    {
      id: 'profile-security', group: 'Account', label: 'Security & PIN',
      icon: <KeyRound size={15} />,
      badge: student?.mustChangePin ? '!' : null,
      tone: student?.mustChangePin ? 'warn' : null,
    },
  ].filter((item) => item.show !== false);

  // Group labels are rendered only where a group actually has entries, so a
  // heading never appears above an empty gap.
  const navGroups = navItems.reduce((groups, item) => {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
    return groups;
  }, []);

  const navIds = navItems.map((item) => item.id);

  // Exactly one section is on screen at a time and the rail is the only way to
  // change it, so the content column never becomes a long scroll in which half
  // the page belongs to a section the reader is not looking at. Seeded from the
  // hash so a shared link opens on the section it names, rather than briefly
  // rendering the overview and then swapping.
  const [section, setSection] = useState(
    () => (typeof window !== 'undefined' && window.location.hash.slice(1)) || 'profile-overview',
  );

  // The record arrives after the first paint (session restore, then up to four
  // requests) and which sections exist depends on it. Rather than chase that
  // with effects, the active id is validated every render and falls back to the
  // first section that actually exists, so a section that disappears can never
  // leave the content column blank.
  const activeId = navIds.includes(section) ? section : navIds[0] || '';
  const activeItem = navItems.find((item) => item.id === activeId) || null;

  // Keep the hash in step with the rail, so the panel on screen is always the
  // one a copied link reopens.
  useEffect(() => {
    if (!activeId) return;
    const next = activeId === 'profile-overview' ? '' : `#${activeId}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
    }
  }, [activeId]);

  // Buttons rather than anchors: nothing scrolls, so a link would only be a
  // link in order to be prevented. The hash is still written by the effect
  // above, which keeps the URL shareable.
  const goTo = (id) => () => {
    setSection(id);
    // On a phone the rail is a strip at the top rather than a rail beside the
    // content, so after a swap the reader can be left below the fold.
    const top = document.getElementById('profile-rail-top');
    if (!top) return;
    const rect = top.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight * 0.5) {
      top.scrollIntoView({ block: 'start' });
    }
  };

  const signOut = () => {
    clearStudentSession();
    setStudent(null);
    setPayment(null);
    setShowForm(true);
    setForm({ regNumber: '', pin: '' });
  };

  return (
    <>
      {/* No page header: the status banner at the top of the board already says
          who this is and where they stand, so a title band above it only pushed
          that first useful line below the fold. */}
      <section className="section section-compact">
        <div className="container profile-shell">
          {!student && showForm && (
            <div className="card profile-auth">
              <div className="profile-auth-head">
                <div className="profile-key-icon"><KeyRound size={22} /></div>
                <h3>Sign in to your DTS Profile</h3>
                <p>Enter the Registration Number and PIN you received by email.</p>
              </div>
              {showForgot ? (
                <form onSubmit={handleForgotPin}>
                  <p className="profile-note-text">
                    Forgot your PIN? Enter the Registration Number and the email you applied with! we&apos;ll email you a new PIN.
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
            <>
              {/* One horizontal header line carrying the facts a student needs
                  at a glance: who they are, what they are studying, where they
                  stand, and what is still outstanding. Previously these were
                  scattered between the sidebar and the overview tiles, so the
                  page had no single place that answered "where am I?". */}
              <header className="profile-top">
                <div className="profile-top-photo">
                  <Avatar size="lg" name={student.name} src={student.photo} eager />
                  <label className="profile-photo-edit" title="Change profile photo">
                    <Camera size={14} />
                    <span className="sr-only">Change profile photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={photoUploading}
                    />
                  </label>
                  {photoUploading && <span className="profile-photo-busy" aria-hidden="true" />}
                </div>

                <div className="profile-top-identity">
                  <h1>{student.name}</h1>
                  <div className="profile-top-facts">
                    <span><IdCard size={13} /> {student.regNumber}</span>
                    <span><GraduationCap size={13} /> {student.intakeTitle || 'No intake'}</span>
                    <span><Mail size={13} /> {student.email}</span>
                    {student.phone ? <span><Phone size={13} /> {student.phone}</span> : null}
                  </div>
                </div>

                <div className="profile-top-side">
                  <span
                    className="app-status-badge profile-top-status"
                    style={{ color: meta.color, background: meta.bg }}
                  >
                    {meta.label}
                  </span>
                  <span className={`profile-top-cert${certificateReady ? ' is-ready' : ''}`}>
                    {certificateReady ? (
                      <><CheckCircle2 size={14} /> Certificate ready</>
                    ) : (
                      <><Lock size={14} /> Certificate not yet issued</>
                    )}
                  </span>
                </div>
              </header>

              <div className="profile-layout">
              {/* The rail owns identity, status, section navigation and the two
                  page-level actions, so the content column never repeats them.
                  Sticky on desktop; on a phone it becomes a card above the
                  content with the sections as a horizontal strip. */}
              <aside className="profile-rail" aria-label="Profile navigation">
                <div className="card profile-rail-card">
                  {/* Name, registration, intake and status now live in the page
                      header, so the rail starts straight at the sections rather
                      than printing the same identity twice on one screen. */}
                  <nav className="profile-rail-nav" aria-label="Profile sections">
                    {navGroups.map((group) => (
                      <div key={group.name} className="profile-rail-group">
                        <div className="profile-rail-group-name">{group.name}</div>
                        {group.items.map((item) => {
                          const isActive = item.id === activeId;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={goTo(item.id)}
                              className={isActive ? 'active' : undefined}
                              aria-current={isActive ? 'true' : undefined}
                            >
                              {item.icon}
                              <span className="profile-rail-label">{item.label}</span>
                              {item.badge != null && (
                                <span
                                  className={`profile-rail-badge${item.tone ? ` is-${item.tone}` : ''}`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </nav>

                  <div className="profile-rail-actions">
                    {!isLoggedIn && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={signOut}>
                        Sign Out
                      </button>
                    )}
                    <Link to="/apply" className="btn btn-outline btn-sm">
                      Apply for Another Intake <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </aside>

              <div className="profile-dash" id="profile-rail-top">
                {statusMessage && (
                  <div className={`profile-banner is-${student.status}`}>
                    {StatusIcon}
                    <p>{statusMessage}</p>
                  </div>
                )}

                {activeItem && (
                  <div className="profile-panel-head">
                    <h2>{activeItem.icon}{activeItem.label}</h2>
                    {activeItem.badge != null && (
                      <span className={`profile-rail-badge${activeItem.tone ? ` is-${activeItem.tone}` : ''}`}>
                        {activeItem.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Keyed on the section so a swap remounts the panel: the entry
                    animation replays and no local state survives into a
                    section the student did not open. */}
                <div className="profile-panel" key={activeId}>
                  {activeId === 'profile-overview' && (
                    <div className="profile-overview">
                      {summaryTiles.length > 0 ? (
                        <div className="profile-summary">
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
                      ) : (
                        <section className="card profile-card">
                          <EmptyNote icon={<LayoutDashboard size={20} style={{ opacity: 0.4 }} />}>
                            Nothing to summarise yet. Your details appear here once DTS has processed your application.
                          </EmptyNote>
                        </section>
                      )}

                      <div className="profile-quick-grid">
                        {navItems
                          .filter((item) => item.id !== 'profile-overview' && item.group !== 'Account')
                          .map((item) => (
                            <button key={item.id} type="button" onClick={goTo(item.id)}>
                              <span className="profile-quick-icon">{item.icon}</span>
                              <span className="profile-quick-body">
                                <b>{item.label}</b>
                                <small>{item.badge ?? 'Not available yet'}</small>
                              </span>
                              <ArrowRight size={14} />
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeId === 'profile-intake' && (
                    <section className="card profile-card">
                      <h3 className="profile-card-title"><GraduationCap size={14} /> Intake Details</h3>
                      <div className="profile-grid">
                        <div className="profile-field"><span><GraduationCap size={13} /> Intake</span><b>{student.intakeTitle}</b></div>
                        {student.program && <div className="profile-field"><span><BookOpen size={13} /> Level</span><b>{student.program}</b></div>}
                        <div className="profile-field"><span><Mail size={13} /> Email</span><b>{student.email}</b></div>
                        {student.phone && <div className="profile-field"><span><Phone size={13} /> Phone</span><b>{student.phone}</b></div>}
                        {student.campus && <div className="profile-field"><span><MapPin size={13} /> Campus</span><b>{student.campus}</b></div>}
                        {student.learningPlace && (
                          <div className="profile-field">
                            <span><MonitorPlay size={13} /> Study mode</span>
                            <b>{student.learningPlace.replace(/^[A-Za-z]+\s+—\s+/, '')}</b>
                          </div>
                        )}
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
                  )}

                  {activeId === 'profile-fees' && (
                    <section className="card profile-card">
                      <div className="profile-card-head">
                        <h3 className="profile-card-title"><CreditCard size={15} /> Payment Status</h3>
                        {paymentLoading && <span className="profile-hint">Updating...</span>}
                      </div>
                      {!payment ? (
                        paymentLoading ? (
                          <div className="loading"><div className="spinner" />Loading payment status...</div>
                        ) : (
                          <EmptyNote icon={<CreditCard size={20} style={{ opacity: 0.4 }} />}>
                            No payment record is linked to your profile yet. Contact the DTS office if you believe this is wrong.
                          </EmptyNote>
                        )
                      ) : (() => {
                        const badge = paymentBadge(payment);
                        const hasFee = Number(payment.expected || 0) > 0;
                        return (
                          <>
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
                              <span className="payment-status-badge" style={{ ...BADGE_STYLES[badge.tone] }}>
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
                          </>
                        );
                      })()}
                    </section>
                  )}

                  {activeId === 'profile-attendance' && (
                    <section className="card profile-card">
                      <div className="profile-card-head">
                        <h3 className="profile-card-title"><CalendarDays size={14} /> Attendance</h3>
                        <span className="profile-hint">
                          {attendance && attendance.total > 0 ? `${attendance.total} sessions` : 'No sessions yet'}
                        </span>
                      </div>
                      {!attendance || attendance.total === 0 ? (
                        <EmptyNote icon={<CalendarDays size={20} style={{ opacity: 0.4 }} />}>
                          No attendance has been recorded yet.
                        </EmptyNote>
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
                        <div className="profile-section">
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

                  {activeId === 'profile-results' && (
                    <section className="card profile-card">
                      <h3 className="profile-card-title"><ChartNoAxesColumn size={14} /> Results &amp; Marks</h3>
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
                        <EmptyNote icon={<ChartNoAxesColumn size={20} style={{ opacity: 0.4 }} />}>
                          {student.status === 'active'
                            ? 'No marks recorded yet.'
                            : 'Marks appear once your application is accepted.'}
                        </EmptyNote>
                      )}
                    </section>
                  )}

                  {activeId === 'profile-achievements' && (
                    <section className="card profile-card">
                      <div className="profile-card-head">
                        <h3 className="profile-card-title"><Award size={14} /> Certificate of Completion</h3>
                        <span className="profile-hint">
                          {certificateReady ? 'Ready' : 'Locked'}
                        </span>
                      </div>

                      {/* One certificate for the whole programme. Both conditions
                          are stated up front, with the outstanding one named, so
                          the student is never left guessing why it is unavailable. */}
                      <div className="certificate-status">
                        <div className={allCoursesCompleted ? 'is-done' : 'is-pending'}>
                          {allCoursesCompleted
                            ? <CheckCircle2 size={15} />
                            : <AlertCircle size={15} />}
                          <span>
                            <b>All courses completed</b>
                            <small>
                              {completedMarks.length} of {totalMarks} course{totalMarks === 1 ? '' : 's'} done
                            </small>
                          </span>
                        </div>

                      </div>

                      {certificateReady ? (
                        <div className="profile-achievements">
                          <div className="profile-achievement">
                            <div className="profile-achievement-icon"><Award size={14} /></div>
                            <div className="profile-achievement-body">
                              <b>{student.intakeTitle || 'Course Appreciation'}</b>
                              <span className="muted">
                                Issued to {student.name}
                                {student.regNumber ? ` · ${student.regNumber}` : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setShowCertificate(true)}
                            >
                              <Download size={13} /> Download
                            </button>
                          </div>
                        </div>
                      ) : (
                          <EmptyNote icon={<Lock size={20} style={{ opacity: 0.4 }} />}>
                            {'Your course appreciation card will unlock once every course on your programme is marked completed.'}
                          </EmptyNote>
                      )}
                    </section>
                  )}

                  {activeId === 'profile-note' && student.remarks && (
                    <section className="card profile-card profile-note">
                      <div className="app-detail-label"><FileText size={13} /> Note from DTS</div>
                      <p>{student.remarks}</p>
                    </section>
                  )}

                  {/* Security lives on the profile rather than behind a link so the
                      PIN a student was emailed by DTS is theirs to replace without
                      having to email anyone. */}
                  {activeId === 'profile-security' && (
                    <>
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
                      <div className="profile-safe is-inline">
                        <ShieldCheck size={14} />
                        <span>Keep your Registration Number and PIN safe — DTS staff will never ask for your PIN.</span>
                      </div>
                    </>
                  )}
                </div>
                </div>
              </div>
            </>
          )}

          {showCertificate && (
            <CertificateModal
              student={student}
              intakeTitle={student?.intakeTitle}
              onClose={() => setShowCertificate(false)}
            />
          )}
        </div>
      </section>
    </>
  );
}
