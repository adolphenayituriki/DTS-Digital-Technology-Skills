import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Monitor, Wifi, Zap, GraduationCap, Award } from 'lucide-react';
import TestimonialCarousel from '../components/TestimonialCarousel';
import FadeIn from '../components/FadeIn';

const heroImages = [
  '/hero-1.jpg',
  '/hero-2.jpg',
  '/hero-3.jpg',
  '/hero-5.jpg',
  '/hero-6.jpg',
];

const programs = [
  { title: 'Google Services', desc: 'Master Gmail, Drive, Docs, and Google Workspace tools for productivity.', icon: <Wifi size={20} />, color: 'blue' },
  { title: 'Microsoft Office', desc: 'Word, Excel, PowerPoint and more for professional document creation.', icon: <Monitor size={20} />, color: 'cyan' },
  { title: 'Photo & Video Editing', desc: 'Create stunning visuals with Photoshop, Premiere Pro and free alternatives.', icon: <Zap size={20} />, color: 'green' },
];

function applyUrl(title) {
  return `/apply?program=${encodeURIComponent(title)}`;
}

function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive((c) => (c + 1) % heroImages.length), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, paused]);

  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="pulse-dot" />
            Established 2022 · UR-Huye Campus
          </div>
          <h1>Empowering Rwanda's <span>Digital</span> Future</h1>
          <p className="hero-desc">
            Digital Technology Skills provides accessible, high-quality technology education
            to students and communities — building real, practical skills for the digital economy.
          </p>
          <div className="hero-actions">
            <Link to="/programs" className="btn btn-primary" style={{ background: 'var(--accent)' }}>
              Explore Programs <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn hero-ghost">
              Get In Touch
            </Link>
          </div>
          <div className="hero-facts">
            <div className="hero-fact"><span>200+</span><small>Students Trained</small></div>
            <div className="hero-fact"><span>5+</span><small>Programs</small></div>
            <div className="hero-fact"><span>3+</span><small>Years Active</small></div>
            <div className="hero-fact"><span>15+</span><small>Communities Reached</small></div>
          </div>
        </div>

        <div className="hero-media">
          <div className="hero-frame" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="hero-slides">
              {heroImages.map((img, i) => (
                <div
                  key={img}
                  className={`hero-slide ${i === active ? 'active' : ''} ${i === (active + heroImages.length - 1) % heroImages.length ? 'prev' : ''}`}
                >
                  <div className="hero-slide-bg" style={{ backgroundImage: `url(${img})` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="hero-glass g1">
            <GraduationCap size={18} /> <b>200+</b> Certified
          </div>
          <div className="hero-glass g2">
            <Award size={18} /> Certified Training
          </div>
          <div className="hero-thumbs">
            {heroImages.map((img, i) => (
              <button
                key={img}
                className={`hero-thumb ${i === active ? 'active' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`Show slide ${i + 1}`}
              >
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="hero-scroll" aria-hidden="true" />
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />

      <section className="section">
        <div className="container">
          <div className="about-intro">
            <FadeIn direction="right">
              <h2 style={{ fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.03em' }}>About Digital Technology Skills</h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '1rem', lineHeight: 1.8 }}>
                Established in September 2022 at UR-Huye Campus, DTS is a student-led association
                dedicated to promoting digital technology learning. We empower members with practical
                computer skills, encourage innovation, and solve real-life problems using technology.
              </p>
              <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', lineHeight: 1.8 }}>
                With over 200 students trained and certified, we provide both foundational and advanced
                technology training that prepares students for the digital economy.
              </p>
              <Link to="/about" className="btn btn-primary">
                Learn More <ArrowRight size={16} />
              </Link>
            </FadeIn>
            <FadeIn direction="left" delay={150}>
              <div className="photo-fill">
                <img src="/activity-1.jpg" alt="DTS Training Session" loading="lazy" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <FadeIn>
            <div className="section-header">
              <h2>Our Programs</h2>
              <p>Comprehensive training programs designed to build practical digital skills</p>
            </div>
          </FadeIn>
          <div className="grid-3">
            {programs.map((p, i) => (
              <FadeIn key={p.title} delay={i * 150}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className={`card-icon ${p.color}`}>{p.icon}</div>
                  <h3>{p.title}</h3>
                  <p style={{ flex: 1 }}>{p.desc}</p>
                  <Link to={applyUrl(p.title)} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start', marginTop: '1.25rem' }}>
                    Apply Now <ArrowRight size={14} />
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={300}>
            <div className="text-center mt-3">
              <Link to="/programs" className="btn btn-outline">
                View All Programs <ArrowRight size={16} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <FadeIn>
            <div className="section-header">
              <h2>What People Say</h2>
              <p>Hear from our community members and graduates</p>
            </div>
          </FadeIn>
          <FadeIn delay={150}>
            <TestimonialCarousel />
          </FadeIn>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <FadeIn>
            <div className="cta-banner">
              <div>
                <h2>Ready to Build Your Digital Skills?</h2>
                <p>Join hundreds of students and community members who have transformed their digital literacy with DTS.</p>
              </div>
              <Link to="/contact" className="btn btn-cta">
                Apply Now <ArrowRight size={16} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}