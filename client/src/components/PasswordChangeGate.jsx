import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, ShieldAlert } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import PasswordForm from './PasswordForm';

/**
 * Full-screen stand-in for a dashboard while `user.mustChangePassword` is set.
 *
 * Every route into a dashboard renders this instead of the real page, so an
 * account provisioned by an admin cannot be used with the password that was
 * emailed to it. Signing out is the only way past it.
 */
export default function PasswordChangeGate({ embedded = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const body = (
    <>
      <div className="pw-gate-banner">
        <ShieldAlert size={18} />
        <div>
          <b>Choose your own password to continue</b>
          <p>
            An administrator created this account and emailed a temporary password to{' '}
            <strong>{user?.email}</strong>. For everyone's security it must be replaced
            before the dashboard opens.
          </p>
        </div>
      </div>

      <PasswordForm
        heading="Set your password"
        description="Enter the temporary password from the email, then pick one of your own."
        submitLabel="Set password & continue"
      />

      <div className="pw-gate-foot">
        <p>
          Wrong email, or no email arrived? <Link to="/contact">Contact the DTS office</Link> and
          an administrator can re-issue your credentials.
        </p>
        <button type="button" className="btn btn-outline btn-sm" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <section className="section account-section"><div className="container"><div className="pw-gate is-embedded">{body}</div></div></section>;
  }

  return (
    <div className="pw-gate-screen">
      <div className="pw-gate">
        <div className="pw-gate-head">
          <span className="pw-gate-icon"><KeyRound size={22} /></span>
          <h1>One last step</h1>
          <p>Signed in as {user?.email}</p>
        </div>
        {body}
      </div>
    </div>
  );
}

/**
 * Wrapper for the dashboards themselves. Returns the gate while a change is
 * outstanding and `children` the moment it is done, so pages do not each have
 * to remember the check.
 */
export function RequirePasswordChange({ children }) {
  const { user } = useAuth();
  if (user?.mustChangePassword) return <PasswordChangeGate />;
  return children;
}
