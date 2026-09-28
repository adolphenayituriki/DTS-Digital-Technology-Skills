import React, { useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import apiFetch from '../api';
import useAuth from '../hooks/useAuth';
import { useToast } from './Toast';
import { PASSWORD_RULES, passwordProblem, passwordStrength } from '../utils/password';

const empty = { current: '', next: '', confirm: '' };

/**
 * The single password-change form used by every dashboard, /account and the
 * forced first-login screen. Keeping one implementation is what stops the
 * rules from drifting between the three places they used to be duplicated.
 *
 * `onSuccess` fires after the API confirms the change, so a caller that shows
 * the form inline can refresh whatever it renders around it.
 */
export default function PasswordForm({
  onSuccess,
  heading = 'Password',
  description = 'Choose a password only you know. You stay signed in afterwards.',
  submitLabel = 'Change password',
  className = '',
  showLastChanged = false,
}) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState(empty);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const strength = useMemo(() => passwordStrength(values.next), [values.next]);

  // Only complain once the user has actually typed something, so a pristine
  // form does not open covered in red.
  const hint = useMemo(() => {
    if (!values.next && !values.confirm) return '';
    if (values.confirm && values.next !== values.confirm) return 'The two passwords do not match';
    return passwordProblem(values.next);
  }, [values.next, values.confirm]);

  const blocked = !values.current || !values.next || Boolean(hint);

  const submit = async (event) => {
    event.preventDefault();
    if (!values.current || !values.next) {
      toast.error('Enter your current password and a new one.');
      return;
    }
    if (hint) {
      toast.error(hint);
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: values.current, newPassword: values.next }),
      });
      setValues(empty);
      // The response carries the refreshed user, which clears
      // mustChangePassword and stamps passwordUpdatedAt in the cached session.
      if (res?.user) updateUser(res.user);
      onSuccess?.(res);
      toast.success('Password changed.', { celebrate: false });
    } catch (error) {
      toast.error(error.message || 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  };

  const lastChanged = user?.passwordUpdatedAt
    ? new Date(user.passwordUpdatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <form className={`card account-card pw-form ${className}`.trim()} onSubmit={submit} noValidate>
      <div className="account-card-head">
        <div>
          <h3><Lock size={16} /> {heading}</h3>
          <p>{description}</p>
        </div>
        {showLastChanged && lastChanged && <span className="account-dirty">Changed {lastChanged}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="pw-current">Current password</label>
        <div className="pw-input-wrap">
          <Lock size={15} />
          <input
            id="pw-current"
            className="form-control"
            type={visible ? 'text' : 'password'}
            value={values.current}
            onChange={set('current')}
            autoComplete="current-password"
            required
          />
        </div>
        <small className="pw-field-hint">
          {user?.mustChangePassword
            ? 'This is the temporary password an administrator emailed to you.'
            : 'The password you use to sign in today.'}
        </small>
      </div>

      <div className="student-form-grid">
        <div className="form-group">
          <label htmlFor="pw-next">New password</label>
          <div className="pw-input-wrap">
            <ShieldCheck size={15} />
            <input
              id="pw-next"
              className={`form-control${values.next && !passwordProblem(values.next) ? ' is-valid' : ''}`}
              type={visible ? 'text' : 'password'}
              value={values.next}
              onChange={set('next')}
              autoComplete="new-password"
              required
            />
          </div>
          {values.next && (
            <div className="pw-strength" aria-hidden="true">
              <div className="pw-strength-track">
                <span style={{ width: `${strength.percent}%`, background: strength.color }} />
              </div>
              <small style={{ color: strength.color }}>{strength.label}</small>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="pw-confirm">Confirm new password</label>
          <div className="pw-input-wrap">
            <ShieldCheck size={15} />
            <input
              id="pw-confirm"
              className={`form-control${values.confirm && values.next === values.confirm && values.confirm ? ' is-valid' : ''}`}
              type={visible ? 'text' : 'password'}
              value={values.confirm}
              onChange={set('confirm')}
              autoComplete="new-password"
              required
            />
          </div>
          {hint && <small className="form-error-hint account-pw-hint">{hint}</small>}
        </div>
      </div>

      {values.next && (
        <ul className="pw-rules">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(values.next);
            return (
              <li key={rule.id} className={ok ? 'ok' : ''}>
                {ok ? <Check size={12} /> : <TriangleAlert size={12} />} {rule.label}
              </li>
            );
          })}
        </ul>
      )}

      <div className="account-actions">
        <button type="submit" className="btn btn-primary" disabled={saving || blocked}>
          {saving ? 'Updating...' : <><Check size={15} /> {submitLabel}</>}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </form>
  );
}
