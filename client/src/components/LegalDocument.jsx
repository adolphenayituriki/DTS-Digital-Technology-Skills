import React from 'react';
import FadeIn from './FadeIn';

// Shared shell for the privacy policy and terms of service. Both documents are
// the same shape - a title, an intro and a list of headed clauses - so the
// rendering lives here and each page supplies only its own text. That keeps the
// wording and the layout of the two documents from drifting apart.
export default function LegalDocument({ title, intro, sections }) {
  return (
    <div className="legal-page">
      <section className="page-header">
        <div className="container">
          <h1>{title}</h1>
          <p>Last updated: 4 October 2026</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <FadeIn direction="up">
            <div className="legal-intro">
              <p>{intro}</p>
            </div>
          </FadeIn>

          <div className="legal-sections">
            {sections.map((section, i) => (
              <FadeIn key={section.heading} delay={i * 60} direction="up">
                <article className="legal-section">
                  <h2>{section.heading}</h2>
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
        </div>
      </section>
    </div>
  );
}