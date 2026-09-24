import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ArrowLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import apiFetch from '../api';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';

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

function Seam({ path, line, gradient, dots }) {
  return (
    <>
      <svg className="auth-seam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#7fe0a8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={path} fill="none" stroke={`url(#${gradient})`} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={line} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {dots.map((d, i) => (
        <span key={i} className="seam-dot" style={{ left: `${d.x}%`, top: `${d.y}%` }} />
      ))}
    </>
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

  const change = (setter) => (e) => setter((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(login) });
      setSession(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name || 'friend'}!`);
      navigate(data.user.role === 'admin' || data.user.role === 'editor' ? '/admin' : '/dashboard');
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
      toast.success('Account created! Welcome to DTS 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <clipPath id="slant-left" clipPathUnits="objectBoundingBox">
            <path d="M 0.18 0 C 0.04 0.32, 0.04 0.68, 0.18 1 L 1 1 L 1 0 Z" />
          </clipPath>
          <clipPath id="slant-right" clipPathUnits="objectBoundingBox">
            <path d="M 0 0 L 0.82 0 C 0.96 0.32, 0.96 0.68, 0.82 1 L 0 1 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className={`auth-flip ${isSignup ? 'flipped' : ''}`}>
        <div className="auth-flip-inner">
          {/* Front face: login form | brand */}
          <div className="auth-face auth-face-login">
            <div className="auth-panel-form">
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
              <div className="auth-student">
                <div className="auth-student-ic"><GraduationCap size={20} /></div>
                <div>
                  <strong>Are you an applicant or student?</strong>
                  <span>Sign in with the Registration Number and PIN you received by email.</span>
                </div>
                <Link to="/profile" className="btn btn-outline btn-sm">View My Profile</Link>
              </div>
            </div>
            <Brand title="Welcome Back" tagline="Continue your digital learning journey." features={loginFeatures} />
            <Seam
              path="M 58.5 0 C 52 32, 52 68, 58.5 100"
              line="M 59 0 C 52.9 32, 52.9 68, 59 100"
              gradient="seam-grad-login"
              dots={[{ x: 56.6, y: 16 }, { x: 53.4, y: 50 }, { x: 56.6, y: 84 }]}
            />
          </div>

          {/* Back face: brand | signup form (mirrored) */}
          <div className="auth-face auth-face-signup">
            <Brand title="Join DTS" tagline="Apply for training intakes and get certified." features={signupFeatures} />
            <Seam
              path="M 41.5 0 C 48 32, 48 68, 41.5 100"
              line="M 41 0 C 47.1 32, 47.1 68, 41 100"
              gradient="seam-grad-signup"
              dots={[{ x: 43.4, y: 16 }, { x: 46.6, y: 50 }, { x: 43.4, y: 84 }]}
            />
            <div className="auth-panel-form">
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
        </div>
      </div>
    </section>
  );
}