import React, { useEffect, useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

export default function Messages() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const fetchMessages = () => {
    setLoading(true);
    apiFetch('/messages')
      .then((d) => setMessages(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(err.message || 'Failed to load messages.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMessages(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const markRead = async (id) => {
    try {
      await apiFetch(`/messages/${id}/read`, { method: 'PUT' });
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, isRead: true } : m)));
    } catch (err) {
      toast.error(err.message || 'Failed to mark message as read.');
    }
  };

  const deleteMessage = async (id) => {
    try {
      await apiFetch(`/messages/${id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m._id !== id));
      toast.success('Message deleted.', { celebrate: false });
    } catch (err) {
      toast.error(err.message || 'Failed to delete message.');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading messages...</div>;

  return (
    <div>
      <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Messages ({messages.length})</h2>
      {messages.length === 0 ? (
        <p style={{ color: 'var(--text-light)' }}>No messages yet.</p>
      ) : (
        <div className="admin-table-scroll">
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
               <tr key={m._id} className={!m.isRead ? 'unread' : ''}>
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
                  <span style={{ fontSize: '0.8rem', color: m.isRead ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                     {m.isRead ? 'Read' : 'Unread'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                     {!m.isRead && (
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
        </div>
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
