import React, { useEffect, useState } from 'react';
import apiFetch from '../api';
import { User, Search, Users } from 'lucide-react';
import FadeIn from '../components/FadeIn';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    apiFetch('/members')
      .then(setMembers)
      .catch(() => setError('Failed to load team members.'))
      .finally(() => setLoading(false));
  }, []);

  const query = q.trim().toLowerCase();
  const filtered = members.filter(
    (m) =>
      !query ||
      [m.name, m.role, m.bio]
        .filter(Boolean)
        .some((v) => v.toString().toLowerCase().includes(query)),
  );

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>Our Team</h1>
          <p>The dedicated students driving DTS forward</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && <div className="loading"><div className="spinner" />Loading team...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && (
            <div className="list-toolbar">
              <p className="list-count">
                <Users size={15} /> {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
              </p>
              <div className="search-box">
                <Search size={15} />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or role..."
                  aria-label="Search team members"
                />
              </div>
            </div>
          )}
          {!loading && !error && members.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No team members found.</p>
          )}
          {!loading && !error && members.length > 0 && filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No members match your search.</p>
          )}
          <div className="grid-4">
            {filtered.map((m, i) => (
              <FadeIn key={m._id} delay={(i % 4) * 100}>
                <div className="card team-card">
                  <div className="team-avatar">
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      <User size={40} />
                    )}
                  </div>
                  <h3>{m.name}</h3>
                  <div className="role">{m.role}</div>
                  {m.bio && <p style={{ fontSize: '0.85rem' }}>{m.bio}</p>}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
