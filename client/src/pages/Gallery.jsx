import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Camera, Search, ImageOff } from 'lucide-react';
import FadeIn from '../components/FadeIn';

// One entry per distinct photo in public/. A few files are byte-identical
// duplicates across the Featured Images / Guests / Graduation images / Teams
// folders, so only one copy of each is listed. `w`/`h` are the intrinsic pixel
// sizes, passed to the <img> so the browser can reserve the tile before the
// file arrives - the visible box is then fixed to a 16/9 ratio by CSS and the
// photo is cropped to fit, so every tile is the same short, wide shape.
//
// Captions are grouped by the folder each photo lives in, so adjust the label
// text here if you want different wording - the list below is the only place
// captions are defined.
const images = [
  // Training
  { src: '/hero-1.jpg', w: 1600, h: 1143, label: 'Training Session', category: 'Training' },
  { src: '/hero-2.jpg', w: 1600, h: 1066, label: 'Computer Workshop', category: 'Training' },
  { src: '/hero-3.jpg', w: 1600, h: 1143, label: 'Classroom Training', category: 'Training' },
  { src: '/hero-5.jpg', w: 1600, h: 1280, label: 'Digital Skills Class', category: 'Training' },
  { src: '/hero-6.jpg', w: 1600, h: 1067, label: 'Hands-on Practice', category: 'Training' },

  // Events
  { src: '/activity-1.jpg', w: 1080, h: 607, label: 'Team Activity', category: 'Events' },
  { src: '/activity-2.jpg', w: 1008, h: 567, label: 'DTS Event', category: 'Events' },
  { src: '/Guests/ELITEFRAMSTUDIO(73).jpg', w: 1448, h: 2000, label: 'Guests at a DTS Event', category: 'Events' },
  { src: '/Guests/ELITEFRAMSTUDIO(133) (1).jpg', w: 1364, h: 2000, label: 'Event Guests', category: 'Events' },
  { src: '/Guests/WhatsApp Image 2026-09-25 at 16.48.45.jpeg', w: 720, h: 1080, label: 'Event Guest', category: 'Events' },
  { src: '/Guests/WhatsApp Image 2026-09-b25 at 16.41.13.jpeg', w: 720, h: 1080, label: 'Event Guest', category: 'Events' },

  // Graduation
  { src: '/Graduation images/ELITEFRAMSTUDIO(100).jpg', w: 2000, h: 1355, label: 'Graduation Ceremony', category: 'Graduation' },
  { src: '/Graduation images/ELITEFRAMSTUDIO(123).jpg', w: 2000, h: 1331, label: 'Graduation Group Photo', category: 'Graduation' },
  { src: '/Graduation images/ELITEFRAMSTUDIO(135).jpg', w: 2000, h: 1920, label: 'Graduation Ceremony', category: 'Graduation' },
  { src: '/Graduation images/ELITEFRAMSTUDIO(93).jpg', w: 2000, h: 1331, label: 'DTS Team and Graduates', category: 'Graduation' },
  { src: '/Graduation images/ELITEFRAMSTUDIO(94).jpg', w: 2000, h: 1235, label: 'Graduation Ceremony', category: 'Graduation' },

  // Team
  { src: '/Featured Images/ELITEFRAMSTUDIO(48).jpg', w: 1887, h: 2000, label: 'DTS Team at Work', category: 'Team' },
  { src: '/Featured Images/ELITEFRAMSTUDIO(134).jpg', w: 2000, h: 1331, label: 'Team Session', category: 'Team' },
  { src: '/Featured Images/ELITEFRAMSTUDIO(135).jpg', w: 1965, h: 2000, label: 'Team at UR-Huye Campus', category: 'Team' },
  { src: '/Featured Images/WhatsApp Image 2026-09-25 at 16.41.13.jpeg', w: 720, h: 720, label: 'Team Moment', category: 'Team' },
  { src: '/Teams/ELITEFRAMSTUDIO(124).jpg', w: 2000, h: 1331, label: 'The DTS Team', category: 'Team' },
];

const categories = ['All', 'Training', 'Events', 'Graduation', 'Team'];

export default function Gallery() {
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const query = q.trim().toLowerCase();
  const visible = useMemo(
    () =>
      (filter === 'All' ? images : images.filter((i) => i.category === filter)).filter(
        (i) => !query || (i.label + ' ' + i.category).toLowerCase().includes(query)
      ),
    [filter, query]
  );

  // The arrow-key handler below is registered once when the lightbox opens, so
  // it must read the current list through a ref - otherwise changing the filter
  // while the lightbox is open leaves it stepping through a stale array.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const close = useCallback(() => setLightbox(null), []);
  const move = useCallback((dir) => {
    const list = visibleRef.current;
    setLightbox((current) => {
      if (!current || list.length === 0) return current;
      const idx = list.findIndex((i) => i.src === current.src);
      if (idx === -1) return current;
      return list[(idx + dir + list.length) % list.length];
    });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, close, move]);

  // A filter change can hide the photo that is currently open in the lightbox.
  useEffect(() => {
    if (lightbox && !visible.some((i) => i.src === lightbox.src)) setLightbox(null);
  }, [visible, lightbox]);

  const currentIndex = lightbox ? visible.findIndex((i) => i.src === lightbox.src) : -1;

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
          <div className="gallery-controls">
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
            <div className="gallery-filters" role="group" aria-label="Filter photos by category">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`filter-pill ${filter === c ? 'active' : ''}`}
                  aria-pressed={filter === c}
                  onClick={() => setFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <p className="gallery-count" aria-live="polite">
            <Camera size={14} /> {visible.length}{' '}
            {visible.length === 1 ? 'photo' : 'photos'}
            {visible.length !== images.length && ` of ${images.length}`}
          </p>

          {visible.length === 0 ? (
            <div className="gallery-empty">
              <ImageOff size={26} />
              <p>No photos match your search.</p>
              <button
                type="button"
                className="filter-pill"
                onClick={() => {
                  setQ('');
                  setFilter('All');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="gallery-grid">
              {visible.map((item, i) => (
                <FadeIn
                  key={`${filter}-${item.src}-${i}`}
                  className="gallery-tile"
                  delay={(i % 4) * 70}
                >
                  <figure
                    className="gallery-card"
                    onClick={() => setLightbox(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLightbox(item);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${item.label}`}
                  >
                    <div className="gallery-media">
                      <img
                        src={item.src}
                        alt={item.label}
                        width={item.w}
                        height={item.h}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="gallery-zoom" aria-hidden="true">
                        <ZoomIn size={17} />
                      </span>
                    </div>
                    <figcaption>
                      <span className="gallery-badge">{item.category}</span>
                      <p>{item.label}</p>
                    </figcaption>
                  </figure>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {lightbox && (
        <div className="lightbox" onClick={close} role="dialog" aria-modal="true" aria-label={lightbox.label}>
          <button className="lightbox-close" onClick={close} aria-label="Close">
            <X size={20} />
          </button>
          {visible.length > 1 && (
            <>
              <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label="Previous">
                <ChevronLeft size={22} />
              </button>
              <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); move(1); }} aria-label="Next">
                <ChevronRight size={22} />
              </button>
            </>
          )}
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.label} width={lightbox.w} height={lightbox.h} />
            <div className="lightbox-caption">
              <span className="gallery-badge">{lightbox.category}</span>
              <p>{lightbox.label}</p>
            </div>
          </div>
          {currentIndex >= 0 && (
            <div className="lightbox-counter" aria-live="polite">
              {currentIndex + 1} / {visible.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
