import React, { useEffect, useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import apiFetch from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

export default function Messages() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMessages = (activePage = 1, { background = false } = {}) => {
    if (!background) setLoading(true);
    apiFetch(`/messages?page=${activePage}`)
      .then((d) => {
        // Legacy bare-array shape, kept so an older cached server response still renders.
        if (Array.isArray(d)) {
          setMessages(d);
          setTotal(d.length);
          setPages(1);
          setPage(1);
          return;
        }
        setMessages(Array.isArray(d?.items) ? d.items : []);
        setTotal(d?.total ?? 0);
        setPages(d?.pages ?? 1);
        setPage(d?.page ?? activePage);
      })
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
    setDeleting(true);
    try {
      await apiFetch(`/messages/${id}`, { method: 'DELETE' });
      toast.success('Message deleted.', { celebrate: false });
      // Refetch rather than splice: the inbox count above the table lives
      // server-side now. Deleting the only row on the last page would otherwise
      // request a page that no longer exists, so step back a page first.
      const targetPage = messages.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      await fetchMessages(targetPage, { background: true });
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to delete message.');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading messages...</div>;

  return (
    <div>
      <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Messages ({total})</h2>
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

      {pages > 1 && (
        <div className="pagination-bar">
          <span className="pagination-count">
            Showing {messages.length} of {total} message{total === 1 ? '' : 's'}
          </span>
          <div className="pagination-controls">
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => fetchMessages(page - 1)}>Previous</button>
            <span className="pagination-page">Page {page} of {pages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => fetchMessages(page + 1)}>Next</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this message?"
        message="This will permanently remove the message from your inbox."
        loading={deleting}
        onConfirm={async () => { if (await deleteMessage(confirmId)) setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
