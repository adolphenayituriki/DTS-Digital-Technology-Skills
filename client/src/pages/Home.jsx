import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Monitor, Wifi, Zap, ChevronLeft, ChevronRight, Users, Rocket } from "lucide-react";
import TestimonialCarousel from "../components/TestimonialCarousel";
import FadeIn from "../components/FadeIn";

const heroImages = ["/hero-1.jpg", "/hero-3.jpg", "/hero-5.jpg", "/hero-6.jpg", "/Featured Images/ELITEFRAMSTUDIO(134).jpg"];
const aboutImages = ["/activity-1.jpg", "/activity-2.jpg", "/hero-2.jpg"];
const featuredImages = [
  "/Featured Images/ELITEFRAMSTUDIO(48).jpg",
  "/Featured Images/ELITEFRAMSTUDIO(73).jpg",
  "/Featured Images/ELITEFRAMSTUDIO(133) (1).jpg",
  "/Featured Images/ELITEFRAMSTUDIO(134).jpg",
  "/Featured Images/ELITEFRAMSTUDIO(135).jpg",
  "/Featured Images/WhatsApp Image 2026-09-25 at 16.41.13.jpeg",
  "/Featured Images/WhatsApp Image 2026-09-25 at 16.48.45.jpeg",
  "/Featured Images/WhatsApp Image 2026-09-b25 at 16.41.13.jpeg",
];
const graduationImages = [
  "/Graduation images/ELITEFRAMSTUDIO(135).jpg",
  "/Graduation images/ELITEFRAMSTUDIO(93).jpg",
  "/Graduation images/ELITEFRAMSTUDIO(94).jpg",
  "/Graduation images/ELITEFRAMSTUDIO(100).jpg",
  "/Graduation images/ELITEFRAMSTUDIO(123).jpg",
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
        {images.map((entry, i) => {
          // Entries may be a plain path string, or `{ src, objectPosition }`
          // for photos that need per-image framing. Without this branch the
          // object was passed straight to `src`, producing a broken image.
          const { src, objectPosition } =
            typeof entry === "string" ? { src: entry, objectPosition: undefined } : entry || {};
          return (
            <div key={src} className={`carousel-slide ${i === active ? "active" : ""}`}>
              <img
                src={src}
                alt={`${altPrefix} ${i + 1}`}
                loading="lazy"
                style={objectPosition ? { objectPosition } : undefined}
              />
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
            <button key={i} className={`carousel-dot ${i === active ? "active" : ""}`} onClick={() => setActive(i)} aria-label={`Go to slide ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageRowCarousel({ images, altPrefix, autoPlay = true, interval = 5000, showArrows = true }) {
  const [scrollX, setScrollX] = useState(0);
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef(null);

  const scrollStep = 300;

  const scrollLeft = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (!autoPlay || !containerRef.current) return;
    const timer = setInterval(() => {
      if (!hovering && containerRef.current) {
        const { scrollLeft: current, scrollWidth, clientWidth } = containerRef.current;
        if (current + clientWidth >= scrollWidth - 10) {
          containerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          containerRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
        }
      }
    }, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, hovering, scrollStep]);

  return (
    <div className="image-row-carousel" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      {showArrows && (
        <>
          <button className="row-carousel-btn prev" onClick={scrollLeft} aria-label="Previous"><ChevronLeft size={22} /></button>
          <button className="row-carousel-btn next" onClick={scrollRight} aria-label="Next"><ChevronRight size={22} /></button>
        </>
      )}
      <div ref={containerRef} className="row-carousel-track">
        {images.map((item, i) => {
          const src = typeof item === 'string' ? item : item.src;
          const objectPosition = typeof item === 'object' && item.objectPosition ? item.objectPosition : 'center';
          // Per-image `objectFit`. Defaults to the stylesheet's `cover`; set
          // `contain` to show a photo whole, with letterbox bars, when cropping
          // would hide the subject.
          const objectFit = typeof item === 'object' && item.objectFit ? item.objectFit : 'cover';
          return (
            <div key={src} className="row-carousel-item">
              <img
                src={src}
                alt={`${altPrefix} ${i + 1}`}
                loading="lazy"
                style={{ objectPosition, objectFit }}
              />
            </div>
          );
        })}
      </div>
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
              <span className="eyebrow">About the company</span>
              <h2 className="section-title">What is DTS?</h2>
              <p className="lead-text">
                Digital Technology Skills is a student-led company established in September 2022 at
                UR-Huye Campus. We promote digital learning, empower members with practical computer skills,
                encourage innovation, and focus on solving real-life problems with technology.
              </p>
              <p className="lead-text">
                We support both new and continuing students. Especially those who don't yet have digital
                skills. Through accessible, hands-on training.
              </p>
              <div className="ms-icon-row">
                <span className="icon-chip"><Users size={15} /> Student-led</span>
                <span className="icon-chip"><Rocket size={15} /> Est. 2022</span>
              </div>
            </FadeIn>
            <FadeIn direction="left" delay={150}>
              <ImageCarousel
                images={aboutImages}
                altPrefix="DTS Training Session"
                autoPlay={true}
                interval={5000}
                showArrows={false}
                showDots={true}
              />
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
          <ImageRowCarousel
            images={featuredImages}
            altPrefix="DTS Featured Moment"
            autoPlay={true}
            interval={3000}
            showArrows={true}
          />
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
          <div className="graduation-layout">
            <div className="graduation-content">
              <FadeIn direction="right">
                <span className="eyebrow">Achievement</span>
                <h3 className="section-title" style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>DTS Graduation</h3>
                <p className="lead-text">
                  Each year, Digital Technology Skills celebrates the successful completion of our training programs with a graduation ceremony that recognizes the hard work and dedication of our students.
                </p>
                <p className="lead-text">
                  Our graduates leave with practical digital skills, industry-recognized certificates, and the confidence to pursue careers in technology or continue their education. Since 2022, we have graduated over 200 students across Basic and Advanced levels.
                </p>
                <div className="graduation-stats" style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                  <div className="grad-stat">
                    <div className="grad-stat-value">200+</div>
                    <div className="grad-stat-label">Graduates</div>
                  </div>
                  <div className="grad-stat">
                    <div className="grad-stat-value">15+</div>
                    <div className="grad-stat-label">Communities Reached</div>
                  </div>
                  <div className="grad-stat">
                    <div className="grad-stat-value">6+</div>
                    <div className="grad-stat-label">Programs Offered</div>
                  </div>
                </div>
                <p className="lead-text" style={{ marginTop: '1.5rem' }}>
                  The graduation ceremony brings together students, trainers, families, and community leaders to celebrate digital empowerment in Rwanda's Southern Province.
                </p>
                <Link to="/gallery" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                  View Graduation Gallery <ArrowRight size={16} />
                </Link>
              </FadeIn>
            </div>
            <div className="graduation-carousel">
              <FadeIn direction="left" delay={150}>
                <ImageCarousel
                  images={graduationImages}
                  altPrefix="DTS Graduation"
                  autoPlay={true}
                  interval={5000}
                  showArrows={true}
                  showDots={true}
                />
              </FadeIn>
            </div>
          </div>
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
