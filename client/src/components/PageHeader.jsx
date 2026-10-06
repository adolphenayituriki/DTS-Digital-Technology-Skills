import React, { useEffect, useState } from "react";

const DEFAULT_IMAGES = [
  "/hero-1.jpg",
  "/hero-3.jpg",
  "/hero-5.jpg",
  "/hero-6.jpg",
];

/**
 * Page header with a slow cross-fade + gentle zoom photo background.
 * Same cadence as the home hero (6s) so the site feels consistent.
 *
 * tone="brand" (default) uses the navy site palette.
 * tone="apply" uses the muted green palette of the application wizard.
 */
export default function PageHeader({
  title,
  subtitle,
  images = DEFAULT_IMAGES,
  tone = "brand",
  className = "",
}) {
  const [active, setActive] = useState(0);
  const slides = images.length > 0 ? images : DEFAULT_IMAGES;

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(
      () => setActive((c) => (c + 1) % slides.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [slides.length]);

  const toneClass = tone === "apply" ? " tone-apply" : "";
  const extra = className ? ` ${className}` : "";

  return (
    <section className={`page-header page-header-animated${toneClass}${extra}`}>
      <div className="page-header-bg" aria-hidden="true">
        {slides.map((img, i) => (
          <div
            key={img}
            className={`page-header-bg-slide ${i === active ? "active" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
      </div>
      <div className="page-header-bg-overlay" aria-hidden="true" />
      <div className="container">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </section>
  );
}
