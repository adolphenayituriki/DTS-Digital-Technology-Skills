import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { metaFor } from '../seo';

// Rewrites the document head when the SPA navigates.
//
// The prerendered pages ship correct tags in their static HTML, but every
// client-side navigation after that leaves the head describing whichever page
// was last loaded from disk. Link unfurlers - WhatsApp, Slack, Facebook,
// LinkedIn - do not run JavaScript at all, so for them this component is the
// only thing that ever sets the right title and description.
//
// Tags are updated in place rather than re-created so the browser does not
// treat a changed <title> as a new document, and the noindex tag is added or
// removed as needed because /privacy and /terms must not stay excluded after
// the visitor navigates away from them.

const setMeta = (key, value) => {
  let el = document.head.querySelector(`meta[${key}="${value.name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(key, value.name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value.content);
};

const setLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

export default function MetaManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = metaFor(pathname);

    document.title = meta.title;
    setMeta('name', { name: 'description', content: meta.description });
    setLink('canonical', meta.canonical);

    setMeta('property', { name: 'og:type', content: meta.ogType });
    setMeta('property', { name: 'og:title', content: meta.title });
    setMeta('property', { name: 'og:description', content: meta.description });
    setMeta('property', { name: 'og:url', content: meta.canonical });
    setMeta('property', { name: 'og:image', content: meta.ogImage });
    setMeta('name', { name: 'twitter:title', content: meta.title });
    setMeta('name', { name: 'twitter:description', content: meta.description });
    setMeta('name', { name: 'twitter:image', content: meta.ogImage });

    const robots = document.head.querySelector('meta[name="robots"]');
    if (meta.noindex) {
      if (!robots) {
        const el = document.createElement('meta');
        el.setAttribute('name', 'robots');
        el.setAttribute('content', 'noindex, follow');
        document.head.appendChild(el);
      } else {
        robots.setAttribute('content', 'noindex, follow');
      }
    } else if (robots) {
      robots.remove();
    }
  }, [pathname]);

  return null;
}