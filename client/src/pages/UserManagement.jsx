import React, { useEffect, useState } from 'react';
import { Save, UserPlus } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

const emptyForm = { name: '', email: '', password: '', role: 'trainer' };

export default function UserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadUsers = () => apiFetch('/users').then((data) => setUsers(Array.isArray(data) ? data : [])).catch((error) => toast.error(error.message || 'Failed to load users.'));
  useEffect(() => { loadUsers().finally(() => setLoading(false)); }, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const createUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(form) });
      toast.success('User account created.');
      setForm(emptyForm);
      await loadUsers();
    } catch (error) { toast.error(error.message || 'Failed to create user.'); } finally { setSaving(false); }
  };
  const updateUser = async (user, changes) => {
    try { const updated = await apiFetch(`/users/${user._id}`, { method: 'PUT', body: JSON.stringify(changes) }); setUsers((current) => current.map((item) => item._id === updated._id ? updated : item)); toast.success('User access updated.'); } catch (error) { toast.error(error.message || 'Failed to update user.'); }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading users...</div>;
  return <div className="workspace-page"><div className="workspace-intro"><div><h2>User Access</h2><p>Create trainer and finance accounts and control staff access.</p></div></div><div className="finance-layout"><form className="dash-panel finance-record-form" onSubmit={createUser}><div className="dash-panel-head"><h3><UserPlus size={17} /> Create staff account</h3></div><div className="student-form-grid"><div className="form-group"><label>Name</label><input className="form-control" value={form.name} onChange={(e) => update('name', e.target.value)} required /></div><div className="form-group"><label>Email</label><input className="form-control" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></div><div className="form-group"><label>Temporary password</label><input className="form-control" type="password" minLength="6" value={form.password} onChange={(e) => update('password', e.target.value)} required /></div><div className="form-group"><label>Role</label><select className="form-control" value={form.role} onChange={(e) => update('role', e.target.value)}><option value="trainer">Trainer</option><option value="finance">Finance</option><option value="editor">Editor</option><option value="user">User</option><option value="admin">Admin</option></select></div></div><button className="btn btn-primary" type="submit" disabled={saving}><Save size={15} /> {saving ? 'Creating...' : 'Create account'}</button></form><div className="dash-panel finance-ledger-panel"><div className="dash-panel-head"><h3>Accounts</h3></div><div className="table-scroll"><table className="admin-table compact-table"><thead><tr><th>User</th><th>Role</th><th>Access</th></tr></thead><tbody>{users.map((user) => <tr key={user._id}><td><strong>{user.name}</strong><small className="table-subtext">{user.email}</small></td><td><select className="form-control" value={user.role} onChange={(e) => updateUser(user, { role: e.target.value })}><option value="admin">Admin</option><option value="editor">Editor</option><option value="trainer">Trainer</option><option value="finance">Finance</option><option value="user">User</option></select></td><td><button className={`btn btn-xs ${user.active ? 'btn-danger' : 'btn-success'}`} onClick={() => updateUser(user, { active: !user.active })}>{user.active ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table></div></div></div></div>;
}
