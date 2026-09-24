import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

const defaultTestimonials = [
  {
    _id: '1',
    name: 'Jean-Pierre Habimana',
    role: 'Computer Science Student',
    content: 'DTS helped me learn Microsoft Office and graphic design skills that I now use daily in my studies. The training was practical and well-organized.',
    rating: 5,
  },
  {
    _id: '2',
    name: 'Marie Claire Uwimana',
    role: 'Business Administration Student',
    content: 'Thanks to DTS, I learned how to apply for jobs online and create professional documents. I got my internship through the skills I gained here.',
    rating: 5,
  },
  {
    _id: '3',
    name: 'Patrick Niyonzima',
    role: 'Community Member',
    content: 'The community training helped me learn how to use Irembo services. I can now help others in my village access government services online.',
    rating: 4,
  },
];

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function TestimonialCarousel({ testimonials }) {
  const items = testimonials?.length ? testimonials : defaultTestimonials;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, paused, items.length]);

  if (items.length === 0) return null;

  const t = items[current];

  return (
    <div className="testimonial-wrap">
      <figure
        className="testimonial-card"
        key={t._id}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <span className="testimonial-bigquote" aria-hidden="true">
          <Quote size={92} />
        </span>
        <div className="stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={18}
              fill={i < (t.rating || 5) ? '#f59e0b' : 'none'}
              color="#f59e0b"
            />
          ))}
        </div>
        <blockquote>"{t.content}"</blockquote>
        <figcaption className="testimonial-author">
          <div className="avatar">{initials(t.name)}</div>
          <div>
            <div className="author">{t.name}</div>
            <div className="role">{t.role}</div>
          </div>
        </figcaption>
      </figure>

      <nav className="testimonial-nav" aria-label="Testimonials">
        <button onClick={prev} aria-label="Previous testimonial">
          <ChevronLeft size={20} />
        </button>
        <div className="testimonial-dots">
          {items.map((item, i) => (
            <button
              key={item._id}
              className={i === current ? 'active' : ''}
              onClick={() => setCurrent(i)}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
        <button onClick={next} aria-label="Next testimonial">
          <ChevronRight size={20} />
        </button>
      </nav>
    </div>
  );
}