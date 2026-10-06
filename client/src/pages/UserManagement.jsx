import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Check, Copy, KeyRound, RotateCcw, Save, ShieldAlert, Trash2,
  UserPlus, Users, UserX, UserCheck,
} from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';
import ActionMenu from '../components/ActionMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import Loading, { TableLoading } from '../components/Loading';
import useDebounced from '../hooks/useDebounced';
import { PASSWORD_MIN_LENGTH } from '../utils/password';
import { emailProblem, normalizeEmail } from '../utils/email';

const ROLES = [
  { value: 'secretary', label: 'Secretary' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'finance', label: 'Finance' },
  { value: 'editor', label: 'Editor' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

const emptyForm = { name: '', email: '', role: 'trainer' };

export default function UserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  // A refetch from typing in the search box must not blank the page - the toolbar
  // (and the search box being typed into) would collapse under a centred spinner.
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetingId, setResetingId] = useState('');
  // Set when the credentials email could not be delivered. The password is
  // shown once, here, because otherwise the account exists but nobody can
  // ever reach it.
  const [fallback, setFallback] = useState(null);
  const [query, setQuery] = useState('');
  // The input stays bound to `query` so typing is instant; `searchTerm` is what
  // reaches the request.
  const searchTerm = useDebounced(query, 300);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmUser, setConfirmUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const abortRef = useRef(null);

  const loadUsers = (activePage = 1, { background = false } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    // Cancel the request being superseded, so a slow response cannot land after
    // a faster one and put the wrong page back on screen.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams({ page: String(activePage) });
    const term = searchTerm.trim();
    if (term) params.set('q', term);

    return apiFetch(`/users?${params.toString()}`, { signal: controller.signal })
      .then((data) => {
        // Legacy bare-array shape, kept so an older cached server response still renders.
        if (Array.isArray(data)) {
          setUsers(data);
          setTotal(data.length);
          setPages(1);
          setPage(1);
          return;
        }
        setUsers(Array.isArray(data?.items) ? data.items : []);
        setTotal(data?.total ?? 0);
        setPages(data?.pages ?? 1);
        setPage(data?.page ?? activePage);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') toast.error(error.message || 'Failed to load users.');
      })
      .finally(() => {
        if (controller.signal.aborted || abortRef.current !== controller) return;
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    // Returns to page 1 when the search term changes; the first run loads the
    // initial page. `loading` decides the in-flight state: the first run shows
    // the centred spinner, later ones only reshape the table body.
    loadUsers(1, { background: !loading });
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

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
      // New staff sort to the top of the newest-first list, so jump back to
      // page 1 rather than refreshing whatever page the operator is on.
      await loadUsers(1, { background: true });
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
      // A role change can move the row in or out of the current search, so the
      // view is reconciled against the server without collapsing the table.
      loadUsers(page, { background: true });
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

  const deleteUser = async () => {
    if (!confirmUser) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/users/${confirmUser._id}`, { method: 'DELETE' });
      setUsers((current) => current.filter((item) => item._id !== confirmUser._id));
      setConfirmUser(null);
      // The cascade count matters: an admin who deletes a trainer needs to know
      // their intake access went with the account.
      const { assignments = 0 } = res?.removed || {};
      toast.success(
        assignments > 0
          ? `${res.message} ${assignments} intake assignment${assignments === 1 ? '' : 's'} removed.`
          : res.message,
        { celebrate: false, duration: 5000 },
      );
      // Refetch rather than splice: the account count above the table is the
      // server's. Deleting the only row on the last page would otherwise request
      // a page that no longer exists, so step back a page first.
      const targetPage = users.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      await loadUsers(targetPage, { background: true });
    } catch (error) {
      toast.error(error.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading users...</div>;

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>User Access</h2>
          <p>Create staff accounts and control who can sign in.</p>
        </div>
      </div>

      {fallback && (
        <div className="alert alert-error fallback-credentials">
          <AlertTriangle size={18} />
          <div>
            <b>{fallback.name} could not be emailed</b>
            <p>The email did not go out. Pass this password on yourself — it is shown only here.</p>
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

      <div className="user-access-layout">
        <form className="dash-panel user-access-form" onSubmit={createUser}>
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

          <p className="form-hint create-user-hint">
            A random password is emailed to the address above. They must replace it at first sign-in.
          </p>

          {form.role === 'trainer' && (
            <p className="form-hint create-user-hint">
              Trainers only see students from the intakes given to them on{' '}
              <Link to="/admin/trainer-assignments">Trainer Assignments</Link>.
            </p>
          )}

          {form.role === 'secretary' && (
            <p className="form-hint create-user-hint">
              Secretaries get the office dashboard and can read applications, students, intakes,
              messages, members, posts and testimonials across the whole site. They cannot create
              staff accounts or change any record.
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={saving}>
            <Save size={15} /> {saving ? 'Creating...' : 'Create & email credentials'}
          </button>
        </form>

        <div className="dash-panel finance-ledger-panel">
          <div className="dash-panel-head">
            <h3><Users size={17} /> Accounts <span className="dash-pill">{total}</span></h3>
            <input
              className="form-control assignment-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or role"
              aria-label="Search accounts"
            />
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table compact-table user-access-table" aria-busy={refreshing}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Password</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Shaped rows instead of a centred spinner: collapsing the table
                    while a search refetches throws away the layout, and an empty
                    table with no error reads as "nothing here". */}
                {refreshing ? (
                  <TableLoading rows={6} cols={4} label="Loading users..." />
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      No accounts match that search.
                    </td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user._id} className={user.active ? undefined : 'is-disabled'}>
                    <td>
                      <strong>{user.name}</strong>
                      <small className="table-subtext">{user.email}</small>
                    </td>
                    <td>
                      <select
                        className="form-control"
                        value={user.role}
                        aria-label={`Role for ${user.name}`}
                        onChange={(e) => updateUser(user, { role: e.target.value })}
                      >
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
                    </td>
                    <td className="col-actions">
                      {/* Disable keeps the audit trail and is the right default;
                          delete is the deliberate alternative, so it is the
                          quieter of the two and sits behind a confirmation. */}
                      <ActionMenu
                        label={`Actions for ${user.name}`}
                        items={[
                          {
                            label: 'Email a new password',
                            tone: 'info',
                            icon: <RotateCcw size={14} />,
                            disabled: resetingId === user._id,
                            onSelect: () => resetPassword(user),
                          },
                          user.active
                            ? {
                                label: 'Disable account',
                                tone: 'warn',
                                icon: <UserX size={14} />,
                                onSelect: () => updateUser(user, { active: false }),
                              }
                            : {
                                label: 'Enable account',
                                tone: 'ok',
                                icon: <UserCheck size={14} />,
                                onSelect: () => updateUser(user, { active: true }),
                              },
                          {
                            label: 'Delete permanently',
                            tone: 'danger',
                            icon: <Trash2 size={14} />,
                            onSelect: () => setConfirmUser(user),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-count">
                Showing {users.length} of {total} account{total === 1 ? '' : 's'}
              </span>
              <div className="pagination-controls">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={loading || refreshing || page <= 1}
                  onClick={() => loadUsers(page - 1, { background: true })}
                >
                  Previous
                </button>
                <span className="pagination-page">Page {page} of {pages}</span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={loading || refreshing || page >= pages}
                  onClick={() => loadUsers(page + 1, { background: true })}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="admin-table-foot">
            <KeyRound size={14} />
            <p>
              Passwords are bcrypt-hashed and never shown again. <b>Reset</b> emails a new one;
              minimum {PASSWORD_MIN_LENGTH} characters.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmUser)}
        title={`Delete ${confirmUser?.name || 'this account'}?`}
        message={
          confirmUser?.role === 'trainer'
            ? 'This removes the account, their sign-in and every intake assigned to them. Attendance and marks already recorded are kept. This cannot be undone.'
            : 'This removes the account and its sign-in for good. This cannot be undone.'
        }
        confirmLabel="Delete account"
        loading={deleting}
        onConfirm={deleteUser}
        onCancel={() => setConfirmUser(null)}
      />
    </div>
  );
}
