import React, { useState } from 'react';
import { Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from './Toast';

const empty = { current: '', next: '', confirm: '' };

const PIN_RE = /^\d{6}$/;

/**
 * Student equivalent of PasswordForm. A student PIN is a fixed 6-digit code
 * issued by DTS, so the strength rules that apply to a staff password make no
 * sense here - the only thing a student controls is who else knows the digits.
 */
export default function ChangePinForm({ onChanged, heading = 'Profile PIN', description, className = '' }) {
  const toast = useToast();
  const [values, setValues] = useState(empty);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const hint = (() => {
    if (values.next && !PIN_RE.test(values.next)) return 'Your PIN must be exactly 6 digits';
    if (values.confirm && values.next !== values.confirm) return 'The two PINs do not match';
    return '';
  })();

  const submit = async (event) => {
    event.preventDefault();
    if (!values.current || !values.next) {
      toast.error('Enter your current PIN and a new one.');
      return;
    }
    if (hint) {
      toast.error(hint);
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/students/mine/pin', {
        method: 'PUT',
        body: JSON.stringify({ currentPin: values.current, newPin: values.next }),
      });
      setValues(empty);
      onChanged?.(res.student);
      toast.success('PIN changed. Use it the next time you sign in.', { celebrate: false });
    } catch (error) {
      toast.error(error.message || 'Could not change your PIN.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={`card profile-card ${className}`.trim()} onSubmit={submit} noValidate>
      <div className="profile-card-head">
        <h3 className="profile-card-title"><KeyRound size={14} /> {heading}</h3>
      </div>
      <p className="profile-hint">
        {description || 'Your PIN is 6 digits and was sent to you by email. Change it to one only you know.'}
      </p>

      <div className="profile-form-grid">
        <div className="form-group">
          <label>Current PIN</label>
          <div className="profile-input-wrap">
            <KeyRound size={15} />
            <input
              className="form-control"
              type={visible ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              value={values.current}
              onChange={set('current')}
              maxLength={6}
            />
          </div>
        </div>
        <div className="form-group">
          <label>New PIN</label>
          <div className="profile-input-wrap">
            <KeyRound size={15} />
            <input
              className={`form-control${values.next && !PIN_RE.test(values.next) ? ' is-invalid' : ''}`}
              type={visible ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              value={values.next}
              onChange={set('next')}
              maxLength={6}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Confirm new PIN</label>
          <div className="profile-input-wrap">
            <KeyRound size={15} />
            <input
              className={`form-control${values.confirm && values.next !== values.confirm ? ' is-invalid' : ''}`}
              type={visible ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              value={values.confirm}
              onChange={set('confirm')}
              maxLength={6}
            />
          </div>
          {hint && <small className="form-error-hint">{hint}</small>}
        </div>
      </div>

      <div className="account-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !values.current || !values.next || Boolean(hint)}>
          {saving ? 'Updating...' : <><Check size={14} /> Change PIN</>}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </form>
  );
}
