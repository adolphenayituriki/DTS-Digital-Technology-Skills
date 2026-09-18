import React, { useEffect, useState } from 'react';
import apiFetch from '../api';
import { Search, Users, Mail, Hourglass } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const AVATAR_THEMES = [
  'linear-gradient(135deg, #23A8DE 0%, #5cc7f0 100%)',
  'linear-gradient(135deg, #142851 0%, #2d4a8f 100%)',
  'linear-gradient(135deg, #39B24C 0%, #6bd07a 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #fbc157 100%)',
  'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)',
];

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

function Avatar({ member }) {
  const theme = AVATAR_THEMES[(member.order || 0) % AVATAR_THEMES.length];
  if (member.photo) {
    return (
      <div className="team-avatar team-avatar-photo">
        <img src={member.photo} alt={member.name} loading="lazy" />
      </div>
    );
  }
  return (
    <div className="team-avatar" style={{ background: theme }} aria-hidden="true">
      {initials(member.name)}
    </div>
  );
}

function MemberCard({ member }) {
  return (
    <div className="card team-card">
      <Avatar member={member} />
      <h3>{member.name}</h3>
      <span className="team-role-pill">{member.role}</span>
      {member.bio && <p className="team-card-bio">{member.bio}</p>}
      {member.email && (
        <a className="team-email" href={`mailto:${member.email}`}>
          <Mail size={13} /> {member.email}
        </a>
      )}
    </div>
  );
}

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
      [m.name, m.role, m.bio, m.email]
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
          {!loading && !error && members.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No team members found.</p>
          )}
          {!loading && !error && members.length > 0 && (
            <>
              <FadeIn>
                <div className="leadership-soon">
                  <div className="leadership-soon-icon">
                    <Hourglass size={22} />
                  </div>
                  <div>
                    <h2>Leadership</h2>
                    <p>Our new leadership team will be announced here soon.</p>
                  </div>
                </div>
              </FadeIn>

              <div className="team-toolbar">
                <div className="search-box team-search-box">
                  <Search size={17} />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name or role..."
                    aria-label="Search team members"
                  />
                </div>
                <p className="list-count">
                  <Users size={15} /> {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
                </p>
              </div>

              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No members match your search.</p>
              )}

              <div className="team-grid">
                {filtered.map((m, i) => (
                  <FadeIn key={m._id} delay={(i % 3) * 90}>
                    <MemberCard member={m} />
                  </FadeIn>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}