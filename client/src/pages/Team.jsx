import React, { useEffect, useState, useCallback } from 'react';
import apiFetch from '../api';
import { Search, Users, Mail, Hourglass, ChevronLeft, ChevronRight } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const AVATAR_THEMES = [
  'linear-gradient(135deg, #23A8DE 0%, #5cc7f0 100%)',
  'linear-gradient(135deg, #142851 0%, #2d4a8f 100%)',
  'linear-gradient(135deg, #39B24C 0%, #6bd07a 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #fbc157 100%)',
  'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)',
];

const teamImages = [
  "/Teams/ELITEFRAMSTUDIO(123).jpg",
  "/Teams/ELITEFRAMSTUDIO(124).jpg",
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

function ImageCarousel({ images, altPrefix, autoPlay = true, interval = 5000, showArrows = true, showDots = true }) {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      if (!hovering) setActive((c) => (c + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, hovering, images.length]);

  const goPrev = useCallback(() => setActive((c) => (c - 1 + images.length) % images.length), [images.length]);
  const goNext = useCallback(() => setActive((c) => (c + 1) % images.length), [images.length]);

  return (
    <div className="image-carousel" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <div className="carousel-track">
        {images.map((src, i) => (
          <div key={src} className={`carousel-slide ${i === active ? "active" : ""}`}>
            <img src={src} alt={`${altPrefix} ${i + 1}`} loading="lazy" />
          </div>
        ))}
      </div>
      {showArrows && images.length > 1 && (
        <>
          <button className="carousel-btn prev" onClick={goPrev} aria-label="Previous"><ChevronLeft size={20} /></button>
          <button className="carousel-btn next" onClick={goNext} aria-label="Next"><ChevronRight size={20} /></button>
        </>
      )}
      {showDots && images.length > 1 && (
        <div className="carousel-dots">
          {images.map((_, i) => (
            <button key={i} className={`carousel-dot ${i === active ? "active" : ""}`} onClick={() => setActive(i)} aria-label={`Go to slide ${i + 1}`} />
          ))}
        </div>
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

      <section className="section wm-section section-alt">
        <div className="container">
          <FadeIn>
            <div className="section-header">
              <h2>DTS Team in Action</h2>
              <p>Moments from our team activities and community work</p>
            </div>
          </FadeIn>
          <ImageCarousel
            images={teamImages}
            altPrefix="DTS Team"
            autoPlay={true}
            interval={5000}
            showArrows={true}
            showDots={true}
          />
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