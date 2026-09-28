import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, LogOut, ShieldCheck, UserCog } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import Avatar from '../components/Avatar';
import PasswordForm from '../components/PasswordForm';

const ROLE_LABEL = {
  admin: 'Administrator',
  editor: 'Editor',
  trainer: 'Trainer',
  finance: 'Finance',
  user: 'Member',
};

const fmtDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * The "Settings" page behind the sidebar entry in the admin, trainer and
 * finance workspaces. Security is the part every role shares, and the only
 * part each of them can change for themselves - role and account access stay
 * with an administrator.
 */
export default function AccountSettings() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      toast.success('Email address copied.', { celebrate: false });
    } catch {
      toast.error('Could not copy. Select the address and copy it manually.', { celebrate: false });
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>Settings</h2>
          <p>Your account details and how to keep it secure.</p>
        </div>
      </div>

      <div className="finance-layout">
        <div className="dash-panel settings-panel">
          <div className="dash-profile-head">
            <Avatar size="lg" name={user?.name || user?.email} src={user?.photo} />
            <div>
              <h3>{user?.name}</h3>
              <p>{user?.email}</p>
              <span className="account-role">
                <ShieldCheck size={12} /> {ROLE_LABEL[user?.role] || user?.role}
              </span>
            </div>
          </div>

          <div className="account-actions">
            <Link to="/account" className="btn btn-outline btn-sm">
              <UserCog size={14} /> Edit name, email &amp; photo
            </Link>
            <button type="button" className="btn btn-outline btn-sm" onClick={copyEmail}>
              Copy email
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={signOut}>
              <LogOut size={14} /> Sign out
            </button>
          </div>

          <div className="account-tips" style={{ marginTop: '1.25rem' }}>
            <h4>What you can change</h4>
            <ul>
              <li>Your <b>password</b> is yours alone — change it here whenever you like.</li>
              <li>Your <b>name, email and photo</b> live on your profile page.</li>
              <li>Your <b>role and account access</b> are set by an administrator.</li>
            </ul>
          </div>
        </div>

        <div className="settings-security">
          {user?.mustChangePassword && (
            <div className="alert alert-error">
              Your password is still the temporary one an administrator emailed to you. Change it now.
            </div>
          )}
          <PasswordForm showLastChanged />

          <div className="card account-card account-danger">
            <h3>Something look wrong?</h3>
            <p>
              If you think someone else has used your account, change your password first, then tell
              the DTS office so access can be reviewed.
            </p>
            <Link to="/contact" className="btn btn-outline btn-sm">
              <ExternalLink size={14} /> Contact DTS
            </Link>
          </div>

          {user?.createdAt && (
            <small className="account-since">Account created {fmtDate(user.createdAt)}</small>
          )}
        </div>
      </div>

      <p className="settings-footnote">
        Settings apply to your account in every DTS dashboard, so you only ever change your password
        in one place.
      </p>
    </div>
  );
}
