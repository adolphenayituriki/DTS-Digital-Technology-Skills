import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn, UserPlus, ArrowLeft, CheckCircle2, GraduationCap, IdCard, KeyRound, Mail,
} from 'lucide-react';
import apiFetch, { setStudentSession, clearStudentSession } from '../api';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { roleHome } from '../roleHome';

const loginFeatures = [
  'Track your applications',
  'Manage your training',
  'Stay updated on intakes',
];

const signupFeatures = [
  'Apply for open intakes',
  'Track application status',
  'Get certified in digital skills',
];

function Brand({ title, tagline, features }) {
  return (
    <aside className="auth-panel-brand">
      <span className="auth-brand-glass" aria-hidden="true" />
      <span className="auth-brand-logo-wrap"><img src="/Logo.png" alt="DTS Logo" className="auth-brand-logo" /></span>
      <h2>{title}</h2>
      <p>{tagline}</p>
      <ul>
        {features.map((f) => (
          <li key={f}>
            <CheckCircle2 size={15} /> {f}
          </li>
        ))}
      </ul>
      <Link to="/" className="auth-back">
        <ArrowLeft size={14} /> Back to Home
      </Link>
    </aside>
  );
}

export default function Auth({ mode }) {
  const isSignup = mode === 'signup';
  const { setSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [login, setLogin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ name: '', email: '', password: '', campus: '' });
  const [loading, setLoading] = useState(false);

  const [stuForm, setStuForm] = useState({ regNumber: '', pin: '' });
  const [stuAuthing, setStuAuthing] = useState(false);
  const [stuError, setStuError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [stuForgot, setStuForgot] = useState({ regNumber: '', email: '' });
  const [stuForgotLoading, setStuForgotLoading] = useState(false);
  const [stuForgotMsg, setStuForgotMsg] = useState('');
  const [stuForgotOk, setStuForgotOk] = useState(false);

  const change = (setter) => (e) => setter((f) => ({ ...f, [e.target.name]: e.target.value }));
  const stuChange = (e) => setStuForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(login) });
      setSession(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name || 'friend'}!`);
      navigate(roleHome(data.user.role));
    } catch (err) {
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (signup.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ ...signup, role: 'user' }) });
      setSession(data.token, data.user);
      toast.success('Account created! Welcome to DTS 🎉', { grand: true });
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setStuError('');
    if (!stuForm.regNumber.trim() || !stuForm.pin.trim()) {
      setStuError('Enter your registration number and PIN.');
      toast.error('Enter your registration number and PIN.');
      return;
    }
    setStuAuthing(true);
    try {
      const result = await apiFetch('/students/login', {
        method: 'POST',
        body: JSON.stringify({ regNumber: stuForm.regNumber, pin: stuForm.pin }),
      });
      setStudentSession(result);
      toast.success(`Signed in as ${result.name}.`);
      navigate('/profile');
    } catch (err) {
      setStuError(err.message || 'Failed to sign in with these credentials.');
      toast.error(err.message || 'Failed to sign in with these credentials.');
    } finally {
      setStuAuthing(false);
    }
  };

  const handleForgotPin = async (e) => {
    e.preventDefault();
    setStuForgotMsg('');
    if (!stuForgot.regNumber.trim() || !stuForgot.email.trim()) {
      setStuForgotOk(false);
      setStuForgotMsg('Enter your registration number and email.');
      toast.error('Enter your registration number and email.');
      return;
    }
    setStuForgotLoading(true);
    try {
      const res = await apiFetch('/students/forgot-pin', {
        method: 'POST',
        body: JSON.stringify(stuForgot),
      });
      setStuForgotOk(true);
      setStuForgotMsg(res.message || 'A new PIN has been sent if the details match.');
      toast.success('If those details match, a new PIN is on its way to your email.');
    } catch (err) {
      setStuForgotOk(false);
      setStuForgotMsg(err.message || 'Something went wrong. Please try again.');
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setStuForgotLoading(false);
    }
  };

  return (
    <section className="auth-page">
      {isSignup ? (
        <div className="auth-card auth-card-signup">
          <Brand title="Join DTS" tagline="Apply for training intakes and get certified." features={signupFeatures} />
          <div className="auth-panel-form">
            <div className="auth-mobile-brand">
              <img src="/Logo.png" alt="DTS Logo" />
              <h2>Digital Technology Skills</h2>
            </div>
            <h1>Create Your Account</h1>
            <p className="auth-subtitle">Join DTS and apply for training intakes</p>
            <form onSubmit={handleSignup}>
              <div className="auth-row">
                <div className="form-group">
                  <label htmlFor="signup-name">Full Name</label>
                  <input id="signup-name" name="name" className="form-control" value={signup.name} onChange={change(setSignup)} placeholder="Your full name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-campus">Campus / Location</label>
                  <input id="signup-campus" name="campus" className="form-control" value={signup.campus} onChange={change(setSignup)} placeholder="e.g. UR-Huye" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="signup-email">Email</label>
                <input id="signup-email" name="email" type="email" className="form-control" value={signup.email} onChange={change(setSignup)} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label htmlFor="signup-password">Password (min 6 chars)</label>
                <input id="signup-password" name="password" type="password" className="form-control" value={signup.password} onChange={change(setSignup)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-accent" disabled={loading}>
                <UserPlus size={16} /> {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
            <p className="auth-switch">
              Already have an account?{' '}
              <Link to="/login" className="auth-flip-link">Log in</Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="auth-login-split">
          <Link to="/profile" className="auth-student-jump">
            <GraduationCap size={16} /> Student Login <ArrowLeft size={13} style={{ transform: 'rotate(180deg)' }} />
          </Link>
          <div className="auth-card auth-card-login">
            <Brand title="Welcome Back" tagline="Continue your digital learning journey." features={loginFeatures} />
            <div className="auth-panel-form">
              <div className="auth-mobile-brand">
                <img src="/Logo.png" alt="DTS Logo" />
                <h2>Digital Technology Skills</h2>
              </div>
              <h1>Log In</h1>
              <p className="auth-subtitle">Welcome back — access your account</p>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="login-email">Email</label>
                  <input id="login-email" name="email" type="email" className="form-control" value={login.email} onChange={change(setLogin)} placeholder="you@example.com" required />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input id="login-password" name="password" type="password" className="form-control" value={login.password} onChange={change(setLogin)} placeholder="••••••••" required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <LogIn size={16} /> {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>
              <p className="auth-switch">
                Don't have an account?{' '}
                <Link to="/signup" className="auth-flip-link">Sign up</Link>
              </p>
            </div>
          </div>

          <aside className="auth-student-card">
            <span className="auth-student-head"><GraduationCap size={22} /></span>
            <h2>Student / Applicant Sign In</h2>
            {showForgot ? (
              <form onSubmit={handleForgotPin} className="auth-student-forgot">
                <p className="auth-student-forgot-note">
                  Forgot your PIN? Enter the Registration Number and the email you applied with — we'll email you a new PIN.
                </p>
                <div className="form-group">
                  <label htmlFor="stu-freg">Registration Number</label>
                  <div className="profile-input-wrap">
                    <IdCard size={16} />
                    <input id="stu-freg" name="regNumber" className="form-control" autoCapitalize="characters" value={stuForgot.regNumber} onChange={(e) => setStuForgot((f) => ({ ...f, regNumber: e.target.value }))} placeholder="e.g. DTS-2026-0001" required />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="stu-femail">Application Email</label>
                  <div className="profile-input-wrap">
                    <Mail size={16} />
                    <input id="stu-femail" name="email" type="email" className="form-control" value={stuForgot.email} onChange={(e) => setStuForgot((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" required />
                  </div>
                </div>
                {stuForgotMsg && (
                  <div className={stuForgotOk ? 'alert alert-info' : 'alert alert-error'}>{stuForgotMsg}</div>
                )}
                <button type="submit" className="btn btn-primary" disabled={stuForgotLoading}>
                  {stuForgotLoading ? 'Sending...' : 'Send New PIN'}
                </button>
                <button type="button" className="auth-btn-link" onClick={() => { setShowForgot(false); setStuForgotMsg(''); }}>
                  <ArrowLeft size={13} /> Back to sign in
                </button>
              </form>
            ) : (
              <>
                <p className="auth-student-sub">
                  Sign in with the Registration Number and PIN from your application email.
                </p>
                <form onSubmit={handleStudentLogin}>
                  <div className="form-group">
                    <label htmlFor="stu-reg">Registration Number</label>
                    <div className="profile-input-wrap">
                      <IdCard size={16} />
                      <input id="stu-reg" name="regNumber" className="form-control" autoCapitalize="characters" value={stuForm.regNumber} onChange={stuChange} placeholder="e.g. DTS-2026-0001" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="stu-pin">PIN</label>
                    <div className="profile-input-wrap">
                      <KeyRound size={16} />
                      <input id="stu-pin" name="pin" className="form-control" type="password" inputMode="numeric" maxLength={6} value={stuForm.pin} onChange={stuChange} placeholder="6-digit PIN" required />
                    </div>
                  </div>
                  {stuError && <div className="alert alert-error">{stuError}</div>}
                  <button type="submit" className="btn btn-primary" disabled={stuAuthing}>
                    {stuAuthing ? 'Verifying...' : 'View My Profile'}
                  </button>
                  <button type="button" className="auth-forgot-link" onClick={() => { setShowForgot(true); setStuError(''); }}>
                    Forgot your PIN?
                  </button>
                </form>
                <div className="auth-student-foot">
                  <p>Credentials are emailed right after you apply.</p>
                  <Link to="/apply" className="btn btn-outline btn-sm">
                    Apply for an Intake
                  </Link>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}