import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera, User, Mail, Phone, Save, Trash2, ShieldCheck, Info,
} from 'lucide-react';
import apiFetch, { API_URL, TOKEN_KEY, getApiOrigin } from '../api';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import Avatar from '../components/Avatar';
import { emailProblem, normalizeEmail } from '../utils/email';
import PasswordForm from '../components/PasswordForm';
import PasswordChangeGate from '../components/PasswordChangeGate';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ROLE_LABEL = {
  admin: 'Administrator',
  editor: 'Editor',
  trainer: 'Trainer',
  finance: 'Finance',
  secretary: 'Secretary',
  user: 'Member',
};

const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function MyProfile() {
  const { user, ready, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Drafts are separate from `user` so an abandoned edit never leaks into the
  // navbar avatar, and "unsaved changes" is just a comparison against user.
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    });
    setPhoto(user.photo || '');
  }, [user]);

  const emailHint = useMemo(
    () => (form.email.trim() ? emailProblem(form.email) : 'Email address is required'),
    [form.email]
  );

  const detailsDirty =
    form.name.trim() !== (user?.name || '') ||
    normalizeEmail(form.email) !== normalizeEmail(user?.email || '') ||
    form.phone.trim() !== (user?.phone || '');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('That file is not an image. Choose a JPG, PNG, GIF or WebP file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('That image is too large. Please choose one under 2 MB.');
      return;
    }

    setUploading(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // A 404 here means the API build in front of this page does not expose
        // POST /api/upload. Say so instead of leaving the admin guessing.
        throw new Error(
          res.status === 404
            ? 'This server build cannot accept photo uploads (POST /api/upload is missing). Ask your administrator to redeploy the API.'
            : data.message || `Upload failed (${res.status})`
        );
      }
      if (!data.url) throw new Error('Upload failed: the server did not return an image URL.');

      const url = getApiOrigin() + data.url;
      // Persist straight away so the avatar is never lost by navigating away
      // before the details form below is submitted.
      const saved = await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ photo: url }),
      });
      setPhoto(url);
      updateUser(saved.user);
      toast.success('Profile photo updated.', { celebrate: false });
    } catch (error) {
      toast.error(error.message || 'Could not upload that image.');
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setPhoto('');
    try {
      const saved = await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ photo: '' }),
      });
      updateUser(saved.user);
      toast.success('Profile photo removed.', { celebrate: false });
    } catch (error) {
      setPhoto(user?.photo || '');
      toast.error(error.message || 'Could not remove the photo.');
    }
  };

  const saveDetails = async (event) => {
    event.preventDefault();
    if (emailHint) {
      toast.error(emailHint, { title: 'Check your email address' });
      return;
    }
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    setSavingDetails(true);
    try {
      const saved = await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      });
      updateUser(saved.user);
      toast.success('Profile updated.', { celebrate: false });
    } catch (error) {
      toast.error(error.message || 'Could not save your profile.');
    } finally {
      setSavingDetails(false);
    }
  };

  if (!ready) return <div className="loading"><div className="spinner" />Loading...</div>;

  if (!user) {
    return (
      <section className="section">
        <div className="container">
          <div className="card account-gate">
            <User size={30} />
            <h2>Sign in to manage your profile</h2>
            <p>Your name, photo and contact details live behind your DTS account.</p>
            <div className="account-gate-actions">
              <Link to="/login" className="btn btn-primary">Log In</Link>
              <Link to="/signup" className="btn btn-outline">Create an account</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Still on the temporary password an admin emailed: nothing else on this
  // page matters until that is replaced.
  if (user.mustChangePassword) return <PasswordChangeGate embedded />;

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>My Profile</h1>
          <p>Your photo and contact details, and how to change your password</p>
        </div>
      </section>

      <section className="section account-section">
        <div className="container">
          <div className="account-layout">
            <aside className="account-aside">
              <div className="card account-id">
                <Avatar size="xl" name={form.name || user.name} src={photo} eager />
                <h3>{form.name || user.name}</h3>
                <span className="account-role">
                  <ShieldCheck size={12} /> {ROLE_LABEL[user.role] || user.role}
                </span>
                {user.email && <small className="account-id-email">{user.email}</small>}
              </div>

              <div className="card account-tips">
                <h4><Info size={14} /> What you can change</h4>
                <ul>
                  <li>Your <b>photo</b>, <b>name</b>, <b>email</b> and <b>phone</b> are yours to edit.</li>
                  <li>Your <b>role</b> and account access are set by an administrator and cannot be changed here.</li>
                  <li>Anything that belongs to your training record, intake, level, campus, is edited by DTS staff so the record stays accurate.</li>
                </ul>
              </div>
            </aside>

            <div className="account-main">
              <form className="card account-card" onSubmit={saveDetails}>
                <div className="account-card-head">
                  <div>
                    <h3><Camera size={16} /> Profile photo</h3>
                    <p>Shown next to your name in the admin and trainer dashboards.</p>
                  </div>
                </div>

                <div className="account-photo-row">
                  <Avatar size="lg" name={form.name || user.name} src={photo} eager />
                  <div className="account-photo-actions">
                    <label className="btn btn-outline btn-sm">
                      <Camera size={14} /> {uploading ? 'Uploading...' : photo ? 'Replace photo' : 'Upload photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleAvatar}
                        hidden
                        disabled={uploading}
                      />
                    </label>
                    {photo && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={removeAvatar}>
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                    <small className="account-photo-hint">JPG, PNG, GIF or WebP · max 2 MB</small>
                  </div>
                </div>

                <hr className="account-divider" />

                <div className="account-card-head">
                  <div>
                    <h3><User size={16} /> Personal details</h3>
                    <p>Used on emails we send you and on certificates.</p>
                  </div>
                  {detailsDirty && <span className="account-dirty">Unsaved changes</span>}
                </div>

                <div className="student-form-grid">
                  <div className="form-group">
                    <label htmlFor="acc-name">Full name</label>
                    <div className="profile-input-wrap">
                      <User size={15} />
                      <input
                        id="acc-name"
                        className="form-control"
                        value={form.name}
                        onChange={update('name')}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="acc-phone">Phone</label>
                    <div className="profile-input-wrap">
                      <Phone size={15} />
                      <input
                        id="acc-phone"
                        className="form-control"
                        value={form.phone}
                        onChange={update('phone')}
                        placeholder="e.g. +250 788 000 000"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="acc-email">Email address</label>
                  <div className="profile-input-wrap">
                    <Mail size={15} />
                    <input
                      id="acc-email"
                      type="email"
                      className={`form-control${emailHint ? ' is-invalid' : ''}`}
                      value={form.email}
                      onChange={update('email')}
                      aria-invalid={Boolean(emailHint)}
                      aria-describedby={emailHint ? 'acc-email-hint' : undefined}
                      required
                    />
                  </div>
                  {emailHint && <small id="acc-email-hint" className="form-error-hint">{emailHint}</small>}
                </div>

                <div className="account-actions">
                  <button type="submit" className="btn btn-primary" disabled={savingDetails || !detailsDirty}>
                    {savingDetails ? 'Saving...' : <><Save size={15} /> Save details</>}
                  </button>
                  {detailsDirty && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setForm({
                        name: user.name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                      })}
                    >
                      Discard
                    </button>
                  )}
                </div>
              </form>

              <PasswordForm showLastChanged />

              <div className="card account-card account-danger">
                <h3>Sign out everywhere</h3>
                <p>
                  Ends this session on this device. You will need your email and password to sign back in.
                </p>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => { logout(); navigate('/'); }}
                >
                  Sign out
                </button>
                {user.createdAt && (
                  <small className="account-since">Account created {fmtDate(user.createdAt)}</small>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
