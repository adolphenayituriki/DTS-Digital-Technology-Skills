import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiFetch from '../api';
import { ArrowRight, Image, Search, FileText } from 'lucide-react';
import FadeIn from '../components/FadeIn';

export default function News() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    apiFetch('/posts')
      .then(setPosts)
      .catch(() => setError('Failed to load news posts.'))
      .finally(() => setLoading(false));
  }, []);

  const query = q.trim().toLowerCase();
  const filtered = posts.filter(
    (p) =>
      !query ||
      [p.title, p.category, p.excerpt, p.content]
        .filter(Boolean)
        .some((v) => v.toString().toLowerCase().includes(query)),
  );

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>News & Updates</h1>
          <p>Stay informed about DTS events, achievements, and training updates</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && <div className="loading"><div className="spinner" />Loading news...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && (
            <div className="list-toolbar">
              <p className="list-count">
                <FileText size={15} /> {filtered.length} {filtered.length === 1 ? 'post' : 'posts'}
              </p>
              <div className="search-box">
                <Search size={15} />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search news..."
                  aria-label="Search news posts"
                />
              </div>
            </div>
          )}
          {!loading && !error && posts.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No news posts yet. Check back soon!</p>
          )}
          {!loading && !error && posts.length > 0 && filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No posts match your search.</p>
          )}
          <div className="grid-3">
            {filtered.map((p, i) => (
              <FadeIn key={p._id} delay={(i % 3) * 100}>
                <Link to={`/news/${p.slug}`} className="card news-card" style={{ textDecoration: 'none' }}>
                <div className="image-placeholder">
                  {p.featuredImage ? (
                    <img src={p.featuredImage} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <Image size={32} />
                      <span>DTS News</span>
                    </>
                  )}
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {p.category && <span className="badge">{p.category}</span>}
                  <h3>{p.title}</h3>
                  <div className="date">
                    {new Date(p.createdAt || p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <p>{p.excerpt || (p.content ? p.content.substring(0, 120) + '...' : '')}</p>
                  <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Read more <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
