import React, { useEffect, useState } from 'react';
import apiFetch from '../api';
import { User } from 'lucide-react';
import FadeIn from '../components/FadeIn';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/members')
      .then(setMembers)
      .catch(() => setError('Failed to load team members.'))
      .finally(() => setLoading(false));
  }, []);

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
          {!loading && !error && members.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No team members found.</p>
          )}
          <div className="grid-4">
            {members.map((m, i) => (
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
