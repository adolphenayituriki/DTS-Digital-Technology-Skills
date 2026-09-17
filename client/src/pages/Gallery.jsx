import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Camera, Search } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const images = [
  { src: '/hero-1.jpg', label: 'Training Session', category: 'Training' },
  { src: '/hero-2.jpg', label: 'Computer Workshop', category: 'Training' },
  { src: '/hero-3.jpg', label: 'Classroom Training', category: 'Training' },
  { src: '/activity-1.jpg', label: 'Team Activity', category: 'Events' },
  { src: '/hero-5.jpg', label: 'Digital Skills Class', category: 'Training' },
  { src: '/hero-6.jpg', label: 'Hands-on Practice', category: 'Training' },
  { src: '/activity-2.jpg', label: 'DTS Event', category: 'Events' },
  { src: '/hero-2.jpg', label: 'Student Workshop', category: 'Training' },
];

const categories = ['All', 'Training', 'Events'];

export default function Gallery() {
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const query = q.trim().toLowerCase();
  const matches = (i) => !query || (i.label + ' ' + i.category).toLowerCase().includes(query);
  const visible = (filter === 'All' ? images : images.filter((i) => i.category === filter)).filter(matches);

  const close = () => setLightbox(null);
  const move = (dir) => {
    setLightbox((current) => {
      const idx = visible.findIndex((i) => i.src === current.src && i.label === current.label);
      const next = (idx + dir + visible.length) % visible.length;
      return visible[next];
    });
  };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>Gallery</h1>
          <p>Moments from our training sessions, events, and activities</p>
        </div>
      </section>

      <section className="section gallery-section">
        <div className="container">
          <div className="gallery-toolbar">
            <p className="gallery-count">
              <Camera size={15} /> {visible.length} {visible.length === 1 ? 'photo' : 'photos'}
            </p>
            <div className="gallery-filters">
              {categories.map((c) => (
                <button
                  key={c}
                  className={`filter-pill ${filter === c ? 'active' : ''}`}
                  onClick={() => setFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="gallery-toolbar gallery-toolbar-search">
            <div className="search-box">
              <Search size={15} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search photos..."
                aria-label="Search gallery"
              />
            </div>
          </div>

          {visible.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 0' }}>
              No photos match your search.
            </p>
          )}

          <div className="gallery-masonry">
            {visible.map((item, i) => (
              <FadeIn key={`${filter}-${item.src}-${i}`} delay={(i % 3) * 90}>
                <figure className="gallery-card" onClick={() => setLightbox(item)}>
                  <img src={item.src} alt={item.label} loading="lazy" />
                  <span className="gallery-zoom">
                    <ZoomIn size={18} />
                  </span>
                  <figcaption>
                    <span className="gallery-badge">{item.category}</span>
                    <p>{item.label}</p>
                  </figcaption>
                </figure>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {lightbox && (
        <div className="lightbox" onClick={close}>
          <button className="lightbox-close" onClick={close} aria-label="Close">
            <X size={20} />
          </button>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label="Previous">
            <ChevronLeft size={22} />
          </button>
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); move(1); }} aria-label="Next">
            <ChevronRight size={22} />
          </button>
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightbox.src} alt={lightbox.label} />
            <div className="lightbox-caption">
              <span className="gallery-badge">{lightbox.category}</span>
              <p>{lightbox.label}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}