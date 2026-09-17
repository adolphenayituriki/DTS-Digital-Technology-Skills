import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiFetch from '../api';
import { ArrowLeft, Calendar, User, CheckCircle } from 'lucide-react';

export default function NewsDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/posts/${slug}`)
      .then(setPost)
      .catch(() => setError('Failed to load article.'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <>
      <section className="page-header">
        <div className="container">
          <Link to="/news" style={{ color: 'rgba(255,255,255,0.8)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> Back to News
          </Link>
          {post && <h1>{post.title}</h1>}
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          {loading && <div className="loading"><div className="spinner" />Loading article...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {post && (
            <article>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={16} />
                  {new Date(post.createdAt || post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                {post.author && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={16} />
                    {post.author}
                  </span>
                )}
                {post.category && (
                  <span className="badge" style={{ fontSize: '0.8rem' }}>{post.category}</span>
                )}
              </div>
              {post.featuredImage && (
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  style={{ width: '100%', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}
                />
              )}
              <div
                style={{ lineHeight: 1.8, color: 'var(--text)' }}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
              {post.steps && post.steps.length > 0 && (
                <div className="news-steps">
                  <h3>Follow These Steps</h3>
                  <div className="steps-flow">
                    {post.steps.map((step, i) => (
                      <div className="step-item" key={i}>
                        <div className="step-number">
                          <span>{i + 1}</span>
                          {i < post.steps.length - 1 && <div className="step-connector" />}
                        </div>
                        <div className="step-body">
                          <div className="step-title">{step.title}</div>
                          <p className="step-desc">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}
        </div>
      </section>
    </>
  );
}
