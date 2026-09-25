import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Monitor, Wifi, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import TestimonialCarousel from "../components/TestimonialCarousel";
import FadeIn from "../components/FadeIn";

const heroImages = ["/hero-1.jpg", "/hero-3.jpg", "/hero-5.jpg", "/hero-6.jpg", "/Featured Images/ELITEFRAMSTUDIO(134).jpg"];
const aboutImages = ["/activity-1.jpg", "/activity-2.jpg", "/hero-2.jpg"];
const featuredImages = [
  "/Featured Images/ELITEFRAMSTUDIO(48).jpg",
  "/Featured Images/ELITEFRAMSTUDIO(73).jpg",
  "/Featured Images/ELITEFRAMSTUDIO(100).jpg",
  "/Featured Images/ELITEFRAMSTUDIO(123).jpg",
];
const graduationImages = [
  "/Graduation images/ELITEFRAMSTUDIO(93).jpg",
  "/Graduation images/ELITEFRAMSTUDIO(94).jpg",
  "/Graduation images/ELITEFRAMSTUDIO(100).jpg",
  "/Graduation images/ELITEFRAMSTUDIO(123).jpg",
  "/Graduation images/ELITEFRAMSTUDIO(135).jpg",
];
const teamImages = [
  "/Teams/ELITEFRAMSTUDIO(123).jpg",
  "/Teams/ELITEFRAMSTUDIO(124).jpg",
];

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

const programs = [
  {
    title: "Google Services",
    desc: "Master Gmail, Drive, Docs, and Google Workspace tools for productivity.",
    icon: <Wifi size={20} />,
    color: "blue",
  },
  {
    title: "Microsoft Office",
    desc: "Word, Excel, PowerPoint and more for professional document creation.",
    icon: <Monitor size={20} />,
    color: "cyan",
  },
  {
    title: "Photo & Video Editing",
    desc: "Create stunning visuals with Photoshop, Premiere Pro and free alternatives.",
    icon: <Zap size={20} />,
    color: "green",
  },
];

function applyUrl(title) {
  return `/apply?program=${encodeURIComponent(title)}`;
}

function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setActive((c) => (c + 1) % heroImages.length),
      6000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        {heroImages.map((img, i) => (
          <div
            key={img}
            className={`hero-bg-slide ${i === active ? "active" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
      </div>
      <div className="hero-overlay" aria-hidden="true" />
      <div className="container hero-inner">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="status-dot" />
            Established 2022 · UR-Huye Campus
          </div>
          <h1>
            Empowering Rwanda's <span>Digital</span> Future
          </h1>
          <p className="hero-desc">
            Digital Technology Skills provides accessible, high-quality
            technology education to students and communities. Bcomuilding real,
            practical skills for the digital economy.
          </p>
          <div className="hero-actions">
            <Link
              to="/programs"
              className="btn btn-primary"
              style={{ background: "var(--accent)" }}
            >
              Explore Programs <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn hero-ghost">
              Get In Touch
            </Link>
          </div>
          <div className="hero-facts">
            <div className="hero-fact">
              <span>200+</span>
              <small>Students Trained</small>
            </div>
            <div className="hero-fact">
              <span>5+</span>
              <small>Programs</small>
            </div>
            <div className="hero-fact">
              <span>3+</span>
              <small>Years Active</small>
            </div>
            <div className="hero-fact">
              <span>15+</span>
              <small>Communities Reached</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [aboutIdx, setAboutIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAboutIdx((i) => (i + 1) % aboutImages.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <Hero />

      <section className="section wm-section">
        <div className="container">
          <div className="about-intro">
            <FadeIn direction="right">
              <h2
                style={{
                  fontWeight: 800,
                  marginBottom: "1rem",
                  letterSpacing: "-0.03em",
                }}
              >
                About Digital Technology Skills
              </h2>
              <p
                style={{
                  color: "var(--text-light)",
                  marginBottom: "1rem",
                  lineHeight: 1.8,
                }}
              >
                Established in September 2022 at UR-Huye Campus, DTS is a
                student-led association dedicated to promoting digital
                technology learning. We empower members with practical computer
                skills, encourage innovation, and solve real-life problems using
                technology.
              </p>
              <p
                style={{
                  color: "var(--text-light)",
                  marginBottom: "1.5rem",
                  lineHeight: 1.8,
                }}
              >
                With over 200 students trained and certified, we provide both
                foundational and advanced technology training that prepares
                students for the digital economy.
              </p>
              <Link to="/about" className="btn btn-primary">
                Learn More <ArrowRight size={16} />
              </Link>
            </FadeIn>
            <FadeIn direction="left" delay={150}>
              <div className="about-slider">
                {aboutImages.map((src, i) => (
                  <div key={src} className={`about-slide ${i === aboutIdx ? "active" : ""}`}>
                    <img src={src} alt="DTS Training Session" loading="lazy" />
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section wm-section section-alt">
        <div className="container">
          <FadeIn>
            <div className="section-header">
              <h2>Featured Moments</h2>
              <p>Highlights from our training sessions and community outreach</p>
            </div>
          </FadeIn>
          <div className="gallery-grid">
            {featuredImages.map((src, i) => (
              <FadeIn key={src} delay={(i % 4) * 100}>
                <div className="gallery-item">
                  <img src={src} alt={`DTS Featured Moment ${i + 1}`} loading="lazy" />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="section wm-section">
        <div className="container">
          <FadeIn>
            <div className="section-header">
              <h2>Graduation & Community Impact</h2>
              <p>Celebrating our graduates and community partnerships</p>
            </div>
          </FadeIn>
          <div className="gallery-grid">
            {graduationImages.map((src, i) => (
              <FadeIn key={src} delay={(i % 5) * 100}>
                <div className="gallery-item">
                  <img src={src} alt={`DTS Graduation ${i + 1}`} loading="lazy" />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="section wm-section section-alt">
        <div className="container">
          <FadeIn>
            <div className="section-header">
              <h2>Our Team</h2>
              <p>The dedicated team behind DTS</p>
            </div>
          </FadeIn>
          <ImageCarousel
            images={teamImages}
            altPrefix="DTS Team Member"
            autoPlay={true}
            interval={5000}
            showArrows={true}
            showDots={true}
          />
        </div>
      </section>

      <section className="section wm-section section-alt">
        <div className="container">
          <FadeIn>
            <div className="section-header">
              <h2>Our Programs</h2>
              <p>
                Comprehensive training programs designed to build practical
                digital skills
              </p>
            </div>
          </FadeIn>
          <div className="grid-3">
            {programs.map((p, i) => (
              <FadeIn key={p.title} delay={i * 150}>
                <div
                  className="card"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <div className={`card-icon ${p.color}`}>{p.icon}</div>
                  <h3>{p.title}</h3>
                  <p style={{ flex: 1 }}>{p.desc}</p>
                  <Link
                    to={applyUrl(p.title)}
                    className="btn btn-outline btn-sm"
                    style={{ alignSelf: "flex-start", marginTop: "1.25rem" }}
                  >
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

      <section className="section wm-section">
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

      <section className="section wm-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <FadeIn>
            <div className="cta-banner">
              <div>
                <h2>Ready to Build Your Digital Skills?</h2>
                <p>
                  Join hundreds of students and community members who have
                  transformed their digital literacy with DTS.
                </p>
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
