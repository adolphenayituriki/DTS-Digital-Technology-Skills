import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiFetch from '../api';
import { Search, Users, Mail, Hourglass, ChevronLeft, ChevronRight, RefreshCw, ArrowRight, Crown } from 'lucide-react';
import FadeIn from '../components/FadeIn';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';

// Mix of team portraits and on-the-ground activity shots so the "in Action"
// strip never collapses to two near-identical frames.
const actionImages = [
  { src: '/gallery/team-1.jpg', label: 'DTS team on campus' },
  { src: '/gallery/team-2.jpg', label: 'Team briefing before training' },
  { src: '/gallery/team-3.jpg', label: 'Members coordinating a session' },
  { src: '/gallery/team-4.jpg', label: 'DTS team in the field' },
  { src: '/gallery/team-5.jpg', label: 'Team group photo' },
  { src: '/Teams/ELITEFRAMSTUDIO(123).jpg', label: 'The DTS team at UR-Huye' },
  { src: '/Teams/ELITEFRAMSTUDIO(124).jpg', label: 'DTS team portrait' },
  { src: '/Graduation images/ELITEFRAMSTUDIO(93).jpg', label: 'DTS team with graduates' },
];

const headerImages = [
  '/gallery/team-1.jpg',
  '/gallery/team-2.jpg',
  '/gallery/team-3.jpg',
  '/Teams/ELITEFRAMSTUDIO(123).jpg',
];

function MemberCard({ member, featured = false }) {
  return (
    <div className={`card team-card${featured ? ' team-card-featured' : ''}`}>
      {featured && (
        <div className="team-card-ribbon" aria-hidden="true">
          <Crown size={13} /> Leadership
        </div>
      )}
      <Avatar size="xl" name={member.name} src={member.photo} />
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
    if (!autoPlay || images.length < 2) return;
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
        {images.map((entry, i) => {
          const src = typeof entry === 'string' ? entry : entry.src;
          const label = (typeof entry === 'object' && entry.label) || `${altPrefix} ${i + 1}`;
          return (
            <div key={src} className={`carousel-slide ${i === active ? 'active' : ''}`}>
              <img src={src} alt={label} loading={i === 0 ? 'eager' : 'lazy'} />
            </div>
          );
        })}
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
            <button key={i} className={`carousel-dot ${i === active ? 'active' : ''}`} onClick={() => setActive(i)} aria-label={`Go to slide ${i + 1}`} />
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

  const loadMembers = useCallback(() => {
    setLoading(true);
    setError('');
    apiFetch('/members')
      .then((data) => {
        // The list endpoint is public; a proxy or an older server can still
        // answer with a non-array body, which used to crash .filter on render.
        setMembers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setMembers([]);
        setError(err?.message || 'Failed to load team members.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const query = q.trim().toLowerCase();
  const filtered = members.filter(
    (m) =>
      !query ||
      [m.name, m.role, m.bio, m.email]
        .filter(Boolean)
        .some((v) => v.toString().toLowerCase().includes(query)),
  );
  const leadership = members.filter((m) => m.isLeadership);
  const regular = filtered.filter((m) => !m.isLeadership || leadership.length === 0);
  const showLeadershipBlock = !loading && !error && leadership.length > 0;

  return (
    <>
      <PageHeader
        title="Our Team"
        subtitle="The dedicated students driving DTS forward"
        images={headerImages}
      />

      <section className="section wm-section section-alt">
        <div className="container">
          <FadeIn>
            <div className="section-header">
              <h2>DTS Team in Action</h2>
              <p>Moments from our team activities and community work</p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <ImageCarousel
              images={actionImages}
              altPrefix="DTS Team"
              autoPlay={true}
              interval={4500}
              showArrows={true}
              showDots={true}
            />
          </FadeIn>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && (
            <div className="loading">
              <div className="spinner" />
              Loading team...
            </div>
          )}

          {error && (
            <div className="team-status-panel">
              <div className="team-status-icon" aria-hidden="true">
                <Users size={22} />
              </div>
              <h2>Team directory unavailable</h2>
              <p>{error}</p>
              <button type="button" className="btn btn-primary" onClick={loadMembers}>
                <RefreshCw size={15} /> Try again
              </button>
            </div>
          )}

          {!loading && !error && members.length === 0 && (
            <div className="team-status-panel">
              <div className="team-status-icon" aria-hidden="true">
                <Users size={22} />
              </div>
              <h2>No team members yet</h2>
              <p>Profiles will appear here once they are added. In the meantime, reach out and we will connect you with the right person.</p>
              <Link to="/contact" className="btn btn-primary">
                Contact Us <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {!loading && !error && members.length > 0 && (
            <>
              {showLeadershipBlock && (
                <FadeIn>
                  <div className="team-subhead">
                    <h2>
                      <Crown size={18} /> Leadership
                    </h2>
                    <p>The students steering DTS day to day</p>
                  </div>
                  <div className="team-grid team-grid-leadership">
                    {leadership.map((m, i) => (
                      <FadeIn key={m._id} delay={i * 90}>
                        <MemberCard member={m} featured />
                      </FadeIn>
                    ))}
                  </div>
                </FadeIn>
              )}

              {!showLeadershipBlock && !query && (
                <FadeIn>
                  <div className="leadership-soon">
                    <div className="leadership-soon-icon">
                      <Hourglass size={22} />
                    </div>
                    <div>
                      <h2>Leadership</h2>
                      <p>Our leadership team will be highlighted here as soon as those roles are published.</p>
                    </div>
                  </div>
                </FadeIn>
              )}

              <FadeIn>
                <div className="team-subhead">
                  <h2>
                    <Users size={18} /> Meet the team
                  </h2>
                  <p>Students and volunteers building DTS at UR-Huye Campus</p>
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
                  <Users size={15} /> {regular.length} {regular.length === 1 ? 'member' : 'members'}
                </p>
              </div>

              {regular.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                  No members match your search.
                </p>
              )}

              <div className="team-grid">
                {regular.map((m, i) => (
                  <FadeIn key={m._id} delay={(i % 3) * 90}>
                    <MemberCard member={m} />
                  </FadeIn>
                ))}
              </div>
            </>
          )}

          {!loading && (
            <FadeIn delay={200}>
              <div className="team-cta">
                <div>
                  <h2>Want to join or collaborate?</h2>
                  <p>DTS is student-led. If you want to train, volunteer, or partner with us, we would love to hear from you.</p>
                </div>
                <Link to="/contact" className="btn btn-primary">
                  Get in touch <ArrowRight size={15} />
                </Link>
              </div>
            </FadeIn>
          )}
        </div>
      </section>
    </>
  );
}
