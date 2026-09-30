import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Check, Copy, KeyRound, Mail, RotateCcw, Save, ShieldAlert, UserPlus,
} from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';
import { PASSWORD_MIN_LENGTH } from '../utils/password';
import { emailProblem, normalizeEmail } from '../utils/email';

const ROLES = [
  { value: 'trainer', label: 'Trainer' },
  { value: 'finance', label: 'Finance' },
  { value: 'editor', label: 'Editor' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

const emptyForm = { name: '', email: '', role: 'trainer' };

const fmtDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB');
};

export default function UserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetingId, setResetingId] = useState('');
  // Set when the credentials email could not be delivered. The password is
  // shown once, here, because otherwise the account exists but nobody can
  // ever reach it.
  const [fallback, setFallback] = useState(null);

  const loadUsers = () =>
    apiFetch('/users')
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(error.message || 'Failed to load users.'));

  useEffect(() => {
    loadUsers().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const createUser = async (event) => {
    event.preventDefault();

    // Checked here first so a completely filled-in form can never be reported
    // back as "name, email and password are required": the browser blocks an
    // empty field, and this catches the whitespace-only and malformed cases the
    // browser happily lets through.
    const name = form.name.trim();
    const email = normalizeEmail(form.email);
    if (!name) {
      toast.error('Enter the full name of the person you are creating.');
      return;
    }
    if (!email) {
      toast.error('Enter the email address their credentials should be sent to.');
      return;
    }
    const emailError = emailProblem(email);
    if (emailError) {
      toast.error(emailError, { title: 'Check this email address' });
      return;
    }
    const alreadyListed = users.some((user) => normalizeEmail(user.email) === email);
    if (alreadyListed) {
      toast.error('An account already uses that email address.', { title: 'Pick a different address' });
      return;
    }

    setSaving(true);
    try {
      const created = await apiFetch('/users', {
        method: 'POST',
        // The server generates the password and emails it, so none is sent here.
        body: JSON.stringify({ name, email, role: form.role }),
      });
      setForm(emptyForm);
      const roleLabel = ROLES.find((r) => r.value === created.role)?.label || created.role;
      if (created.emailSent) {
        toast.success(`${created.name} (${roleLabel}) can now sign in — credentials emailed to ${created.email}.`, { duration: 6000 });
      } else {
        setFallback({ name: created.name, email: created.email, password: created.temporaryPassword });
        toast.error('Account created, but the credentials email could not be sent.', { title: 'Copy the password below' });
      }
      await loadUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (user, changes) => {
    try {
      const updated = await apiFetch(`/users/${user._id}`, { method: 'PUT', body: JSON.stringify(changes) });
      setUsers((current) => current.map((item) => item._id === updated._id ? updated : item));
      toast.success('User access updated.');
    } catch (error) {
      toast.error(error.message || 'Failed to update user.');
    }
  };

  const resetPassword = async (user) => {
    setResetingId(user._id);
    try {
      const res = await apiFetch(`/users/${user._id}/reset-password`, { method: 'POST' });
      setUsers((current) => current.map((item) => (item._id === user._id ? res.user : item)));
      if (res.emailSent) {
        toast.success(`New password emailed to ${res.user.email}.`, { duration: 6000 });
      } else {
        setFallback({ name: res.user.name, email: res.user.email, password: res.temporaryPassword });
        toast.error('Password reset, but the email could not be sent.', { title: 'Copy the password below' });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to reset the password.');
    } finally {
      setResetingId('');
    }
  };

  const copyFallback = async () => {
    try {
      await navigator.clipboard.writeText(fallback.password);
      toast.success('Password copied.', { celebrate: false });
    } catch {
      toast.error('Could not copy. Select the password and copy it manually.', { celebrate: false });
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading users...</div>;

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>User Access</h2>
          <p>Create trainer and finance accounts and control staff access.</p>
        </div>
      </div>

      {fallback && (
        <div className="alert alert-error fallback-credentials">
          <AlertTriangle size={18} />
          <div>
            <b>{fallback.name} could not be emailed {fallback.password ? '' : ''}</b>
            <p>
              The credentials email did not go out. Pass this on yourself, or ask an administrator to
              re-send it. The password is shown only here and never again.
            </p>
            <div className="fallback-credentials-row">
              <span><small>Email</small><b>{fallback.email}</b></span>
              <span><small>Temporary password</small><b className="mono">{fallback.password}</b></span>
              <button type="button" className="btn btn-outline btn-xs" onClick={copyFallback}>
                <Copy size={12} /> Copy
              </button>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => setFallback(null)}>
                <Check size={12} /> Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="finance-layout">
        <form className="dash-panel finance-record-form" onSubmit={createUser}>
          <div className="dash-panel-head">
            <h3><UserPlus size={17} /> Create staff account</h3>
          </div>

          <div className="student-form-grid">
            <div className="form-group">
              <label>Name</label>
              <input className="form-control" value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="where the credentials are sent"
                required
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-control" value={form.role} onChange={(e) => update('role', e.target.value)}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="alert alert-info create-user-note">
            <Mail size={17} />
            <p>
              A strong random password is generated and emailed to the address above. The user must
              replace it themselves the first time they sign in, so nobody else ever knows their
              password — not even you.
            </p>
          </div>

          {form.role === 'trainer' && (
            <div className="alert alert-info create-user-note">
              <UserPlus size={17} />
              <p>
                This account will have the <b>Trainer</b> role and can sign in to the trainer
                dashboard. Next, give them the intakes they teach on{' '}
                <Link to="/admin/trainer-assignments">Trainer Assignments</Link> — a trainer only
                sees the students of the intakes assigned to them.
              </p>
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={saving}>
            <Save size={15} /> {saving ? 'Creating...' : 'Create & email credentials'}
          </button>
        </form>

        <div className="dash-panel finance-ledger-panel">
          <div className="dash-panel-head">
            <h3>Accounts</h3>
          </div>
          <div className="table-scroll">
            <table className="admin-table compact-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Password</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small className="table-subtext">{user.email}</small>
                      {user.createdAt && <small className="table-subtext">Added {fmtDate(user.createdAt)}</small>}
                    </td>
                    <td>
                      <select className="form-control" value={user.role} onChange={(e) => updateUser(user, { role: e.target.value })}>
                        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td>
                      {user.mustChangePassword ? (
                        <span className="pw-badge is-pending" title="They still have the temporary password and must change it before they can use the dashboard.">
                          <ShieldAlert size={12} /> Awaiting change
                        </span>
                      ) : (
                        <span className="pw-badge" title="The user has set their own password.">
                          <Check size={12} /> Own password
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-xs pw-reset-btn"
                        onClick={() => resetPassword(user)}
                        disabled={resetingId === user._id}
                        title={`Email ${user.name} a new temporary password`}
                      >
                        <RotateCcw size={12} /> {resetingId === user._id ? 'Sending...' : 'Reset'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-xs ${user.active ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => updateUser(user, { active: !user.active })}
                      >
                        {user.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-table-foot">
            <KeyRound size={14} />
            <p>
              Passwords are stored as bcrypt hashes and are never visible to anyone, including you.
              Use <b>Reset</b> to email a new temporary password to a locked-out user; they will be
              required to change it before the dashboard opens. Minimum {PASSWORD_MIN_LENGTH} characters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
