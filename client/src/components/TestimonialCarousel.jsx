import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

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

export default function TestimonialCarousel({ testimonials }) {
  const items = testimonials?.length ? testimonials : defaultTestimonials;
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const t = items[current];
  const initials = t.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div>
      <div className="testimonial-card" key={t._id}>
        <div className="avatar">{initials}</div>
        <div className="stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={17}
              fill={i < (t.rating || 5) ? '#f59e0b' : 'none'}
              color="#f59e0b"
              style={{ display: 'inline' }}
            />
          ))}
        </div>
        <blockquote>"{t.content}"</blockquote>
        <div className="t-divider" />
        <div className="author">{t.name}</div>
        <div className="role">{t.role}</div>
      </div>
      <div className="testimonial-nav">
        <button onClick={prev} aria-label="Previous"><ChevronLeft size={20} /></button>
        <button onClick={next} aria-label="Next"><ChevronRight size={20} /></button>
      </div>
    </div>
  );
}
