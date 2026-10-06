// Single source of truth for per-route metadata.
//
// Two consumers depend on this and they must never disagree:
//   1. the prerenderer, which bakes these tags into the static HTML at build
//      time, and
//   2. <MetaManager>, which rewrites them on client-side navigation.
// Today the titles lived in App.jsx and the descriptions did not exist at all,
// so every share and every search result used the homepage blurb.
//
// Absolute URLs are built from SITE_ORIGIN rather than pasted into index.html,
// so pointing the site at a new host is a one-value change instead of an edit
// in several files.

const configured = import.meta.env?.VITE_SITE_URL || import.meta.env?.SITE_URL;
export const SITE_ORIGIN = String(configured || 'https://dtsrw.vercel.app').replace(/\/+$/, '');

const BRAND = 'DTS Rwanda';
const TITLE_SUFFIX = `Digital Technology Skills | ${BRAND}`;

const DEFAULT_DESCRIPTION =
  'DTS is a student and citizen-led company at UR-Huye Campus empowering students and communities with hands-on technology training and digital literacy since 2022.';

// Ordered so the more specific prefixes are tested first when matching, and so
// the sitemap is emitted in a deliberate priority order rather than object order.
export const ROUTES = [
  {
    path: '/',
    title: `${BRAND} | Digital Technology Skills`,
    description: DEFAULT_DESCRIPTION,
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    path: '/about',
    title: `About Us | ${TITLE_SUFFIX}`,
    description:
      'DTS Rwanda is a student and citizen-led company at UR-Huye Campus. Learn how we have trained students and community members in practical digital skills since 2022.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/programs',
    title: `Our Programs | ${TITLE_SUFFIX}`,
    description:
      'Six hands-on training programs at UR-Huye Campus: Google Services, Microsoft Office, online job applications, photo and video editing, computer maintenance and computer graphics. Each runs 2-3 months.',
    priority: '0.9',
    changefreq: 'monthly',
  },
  {
    path: '/apply',
    title: `Apply | ${TITLE_SUFFIX}`,
    description:
      'Choose an open DTS intake and submit your application in minutes. Upload your certificate, pick your preferred courses and learning place, and start your digital skills training at UR-Huye Campus.',
    priority: '0.9',
    changefreq: 'weekly',
  },
  {
    path: '/gallery',
    title: `Gallery | ${TITLE_SUFFIX}`,
    description:
      'Moments from DTS training sessions, community events and graduation days at UR-Huye Campus in Rwanda.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/team',
    title: `Our Team | ${TITLE_SUFFIX}`,
    description:
      'Meet the dedicated students and staff driving DTS Rwanda forward.',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    path: '/news',
    title: `News | ${TITLE_SUFFIX}`,
    description:
      'Stay informed about DTS Rwanda events, achievements and training updates.',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/contact',
    title: `Contact Us | ${TITLE_SUFFIX}`,
    description:
      'Have a question about DTS Rwanda training, applications or volunteering? Get in touch with the team at UR-Huye Campus.',
    priority: '0.6',
    changefreq: 'yearly',
  },
  {
    path: '/privacy',
    title: `Privacy Policy | ${TITLE_SUFFIX}`,
    description: `How ${BRAND} collects, uses and protects your personal data.`,
    priority: '0.3',
    changefreq: 'yearly',
    noindex: true,
  },
  {
    path: '/terms',
    title: `Terms of Service | ${TITLE_SUFFIX}`,
    description: `The terms that apply when you use the ${BRAND} website or join a training program.`,
    priority: '0.3',
    changefreq: 'yearly',
    noindex: true,
  },
];

// Routes behind the role-gated workspaces. No public URL to index and no
// description worth writing, but they still need a real document.title so a
// bookmarked or shared dashboard tab does not read "DTS" with no context. These
// are the titles App.jsx carried before the SEO work; kept verbatim so no
// workspace tab title changed.
const INTERNAL_TITLES = {
  '/login': 'Login',
  '/signup': 'Sign Up',
  '/dashboard': 'My Dashboard',
  '/profile': 'Student Profile',
  '/account': 'My Profile',
  '/admin': 'Admin Dashboard',
  '/admin/messages': 'Messages',
  '/admin/members': 'Members',
  '/admin/posts': 'Posts',
  '/admin/intakes': 'Intakes',
  '/admin/applications': 'Applications',
  '/admin/students': 'Students',
  '/admin/testimonials': 'Testimonials',
  '/admin/users': 'User Access',
  '/admin/trainer-assignments': 'Trainer Assignments',
  '/admin/settings': 'Settings',
  '/trainer': 'Trainer Dashboard',
  '/trainer/students': 'Trainer Students',
  '/trainer/attendance': 'Trainer Attendance',
  '/trainer/marks': 'Trainer Marks',
  '/trainer/settings': 'Settings',
  '/finance': 'Finance Dashboard',
  '/finance/students': 'Finance Student Balances',
  '/finance/records': 'Finance Records',
  '/finance/fees': 'Finance Intake Fees',
  '/finance/settings': 'Settings',
  '/secretary': 'Secretary Dashboard',
  '/secretary/settings': 'Settings',
};

// Routes that get a real static HTML file at build time. Every one of these is
// either fully static JSX or degrades to a useful shell, so none of them depend
// on the API being up while the site builds.
//
// Deliberately excluded from PRERENDER_PATHS: /team, /news, /news/:slug, /contact
// and /apply all fetch their content in useEffect, so a prerender would bake in a
// loading spinner. They still ship correct <head> tags via MetaManager, which is
// what link unfurlers (WhatsApp, Slack, Facebook) actually read, and they are all
// public and indexable, so they stay in the sitemap.
// Note /apply must not be Disallowed in robots.txt: it is public, and a URL that
// the sitemap advertises while robots.txt blocks is a contradiction.
export const PRERENDER_PATHS = ROUTES
  .filter((route) => ['/', '/about', '/programs', '/gallery', '/privacy', '/terms'].includes(route.path))
  .map((route) => route.path);

const byPath = new Map(ROUTES.map((route) => [route.path, route]));

// Longest prefix wins, so /news/:slug style detail pages inherit their section
// rather than falling back to the site default.
const matchRoute = (pathname) => {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (byPath.has(clean)) return byPath.get(clean);
  const section = Object.keys(byPath)
    .filter((key) => key !== '/')
    .sort((a, b) => b.length - a.length)
    .find((key) => clean === key || clean.startsWith(`${key}/`));
  return section ? byPath.get(section) : null;
};

export const canonicalFor = (pathname) => `${SITE_ORIGIN}${pathname.replace(/\/+$/, '') || '/'}`;

// The og:image is absolute because social scrapers will not resolve a relative
// one. Width and height are declared so WhatsApp and Slack do not guess at an
// aspect ratio and crop the preview.
const OG_IMAGE = `${SITE_ORIGIN}/og-dts-team-activity.jpg`;

export const metaFor = (pathname) => {
  const route = matchRoute(pathname);
  const clean = pathname.replace(/\/+$/, '') || '/';

  // A news detail page has no entry of its own, but it inherits the section's
  // description and canonical shape rather than dropping to the site default.
  const isDetail = clean.startsWith('/news/');

  let title;
  if (isDetail) title = `News | ${TITLE_SUFFIX}`;
  else if (route) title = route.title;
  else title = `${INTERNAL_TITLES[clean] || BRAND} | ${TITLE_SUFFIX}`;

  return {
    title,
    description: (route && route.description) || DEFAULT_DESCRIPTION,
    canonical: canonicalFor(clean),
    ogType: route ? 'website' : 'article',
    ogImage: OG_IMAGE,
    noindex: Boolean(route && route.noindex),
  };
};

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Rendered into the prerendered HTML. Kept as a string builder rather than JSX
// because this file also runs in a plain Node script with no React involved.
export const headTagsFor = (pathname) => {
  const meta = metaFor(pathname);
  const tags = [
    `<title>${escapeAttr(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    `<link rel="canonical" href="${escapeAttr(meta.canonical)}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(meta.ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="DTS team activity at UR-Huye Campus" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(meta.ogImage)}" />`,
  ];
  if (meta.noindex) tags.push(`<meta name="robots" content="noindex, follow" />`);
  return tags.join('\n    ');
};

// Organization schema, so a knowledge panel can be built from the site rather
// than guessed. Emitted on every prerendered page.
export const organizationJsonLd = () =>
  JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'NGO',
      name: 'DTS Rwanda',
      alternateName: 'Digital Technology Skills',
      description: DEFAULT_DESCRIPTION,
      url: SITE_ORIGIN,
      logo: `${SITE_ORIGIN}/Logo.png`,
      image: OG_IMAGE,
      foundingDate: '2022',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Huye',
        addressRegion: 'Southern Province',
        addressCountry: 'RW',
      },
      areaServed: { '@type': 'Country', name: 'Rwanda' },
      knowsAbout: [
        'Digital literacy',
        'Google Workspace',
        'Microsoft Office',
        'Photo and video editing',
        'Computer maintenance',
        'Online job applications',
      ],
    },
    null,
    2
  );