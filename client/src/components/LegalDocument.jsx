import React, { useEffect, useState } from 'react';
import FadeIn from './FadeIn';
import PageHeader from './PageHeader';
import { ArrowUp, ShieldCheck, FileText, Scale, Mail } from 'lucide-react';

const headerImages = [
  '/gallery/training-2.jpg',
  '/hero-3.jpg',
  '/gallery/events-2.jpg',
];

function sectionId(heading) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Shared shell for the privacy policy and terms of service. Both documents are
// the same shape - a title, an intro and a list of headed clauses - so the
// rendering lives here and each page supplies only its own text.
export default function LegalDocument({ title, intro, sections, icon = 'shield' }) {
  const [activeId, setActiveId] = useState('');
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(sectionId(s.heading)))
      .filter(Boolean);
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.4, 0.75] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [sections]);

  const HeaderIcon = icon === 'scale' ? Scale : icon === 'file' ? FileText : ShieldCheck;

  return (
    <div className="legal-page">
      <PageHeader
        title={title}
        subtitle="Digital Technology Skills · UR-Huye Campus"
        images={headerImages}
      />

      <section className="section legal-body">
        <div className="container legal-layout">
          <aside className="legal-toc" aria-label="On this page">
            <p className="legal-toc-label">
              <HeaderIcon size={14} /> On this page
            </p>
            <nav>
              <ol>
                {sections.map((section, i) => {
                  const id = sectionId(section.heading);
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className={activeId === id ? 'is-active' : ''}
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(id);
                          if (!el) return;
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          setActiveId(id);
                        }}
                      >
                        <span className="legal-toc-num">{String(i + 1).padStart(2, '0')}</span>
                        {section.heading}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          <div className="legal-main">
            <FadeIn direction="up">
              <div className="legal-intro-card">
                <div className="legal-intro-badge">
                  <HeaderIcon size={16} />
                  <span>Last updated 4 October 2026</span>
                </div>
                <p>{intro}</p>
              </div>
            </FadeIn>

            <div className="legal-sections">
              {sections.map((section, i) => (
                <FadeIn key={section.heading} delay={Math.min(i * 50, 300)} direction="up">
                  <article className="legal-section" id={sectionId(section.heading)}>
                    <header className="legal-section-head">
                      <span className="legal-section-num" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h2>{section.heading}</h2>
                    </header>
                    {section.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                    {section.points && (
                      <ul>
                        {section.points.map((point) => (
                          <li key={point.slice(0, 40)}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                </FadeIn>
              ))}
            </div>

            <FadeIn direction="up">
              <div className="legal-contact">
                <div className="legal-contact-icon" aria-hidden="true">
                  <Mail size={18} />
                </div>
                <div>
                  <h3>Questions about this document?</h3>
                  <p>
                    Email{' '}
                    <a href="mailto:digitaltechnologyskills1yahoo@gmail.com">
                      digitaltechnologyskills1yahoo@gmail.com
                    </a>{' '}
                    or visit the DTS office at UR-Huye Campus.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <button
        type="button"
        className={`legal-back-top ${showTop ? 'is-visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}
