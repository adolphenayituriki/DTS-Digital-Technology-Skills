import React, { useEffect, useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const fetchMessages = () => {
    apiFetch('/messages')
      .then((d) => setMessages(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMessages(); }, []);

  const markRead = async (id) => {
    try {
      await apiFetch(`/messages/${id}`, { method: 'PUT', body: JSON.stringify({ read: true }) });
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, read: true } : m)));
    } catch { /* ignore */ }
  };

  const deleteMessage = async (id) => {
    try {
      await apiFetch(`/messages/${id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading messages...</div>;

  return (
    <div>
      <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Messages ({messages.length})</h2>
      {messages.length === 0 ? (
        <p style={{ color: 'var(--text-light)' }}>No messages yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>From</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m._id} className={!m.read ? 'unread' : ''}>
                <td>
                  <strong>{m.name}</strong>
                  <br />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{m.email}</span>
                </td>
                <td>{m.subject || 'No subject'}</td>
                <td style={{ fontSize: '0.85rem' }}>
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <span style={{ fontSize: '0.8rem', color: m.read ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                    {m.read ? 'Read' : 'Unread'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    {!m.read && (
                      <button className="btn btn-outline btn-sm" onClick={() => markRead(m._id)} title="Mark as read">
                        <Eye size={14} />
                      </button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(m._id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this message?"
        message="This will permanently remove the message from your inbox."
        onConfirm={async () => { await deleteMessage(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
