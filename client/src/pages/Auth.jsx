import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
      <div className={`auth-card ${isSignup ? 'auth-card-signup' : 'auth-card-login'}`}>
        <Brand
          title={isSignup ? 'Join DTS' : 'Welcome Back'}
          tagline={isSignup ? 'Apply for training intakes and get certified.' : 'Continue your digital learning journey.'}
          features={isSignup ? signupFeatures : loginFeatures}
        />

        <div className="auth-panel-form">
          <div className="auth-mobile-brand">
            <img src="/Logo.png" alt="DTS Logo" />
            <h2>Digital Technology Skills</h2>
          </div>

          {!isSignup ? (
            <>
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}