// Build-time prerenderer.
//
// Runs after `vite build` plus a second `vite build --ssr`, and writes a real
// static HTML file per public route. Before this existed the deployed site
// shipped an empty <div id="root"> and every crawler, Slack unfurl and WhatsApp
// preview saw a blank page.
//
// It reads dist/index.html purely as a template and swaps two marked regions:
// the head block and the root div. Everything else - the module script, the font
// preconnects, the asset paths - comes from the normal Vite build, so there is
// one source of truth for the shell.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const serverBundle = join(root, 'dist-server');
const serverEntry = join(serverBundle, 'entry-server.js');

const HEAD_OPEN = '<!--prerender:head-->';
const HEAD_CLOSE = '<!--/prerender:head-->';

const log = (message) => process.stdout.write(`[prerender] ${message}\n`);

if (!existsSync(dist) || !existsSync(serverEntry)) {
  log('SKIPPED: dist/ or dist-server/ missing.');
  process.exit(0);
}

const { render, PRERENDER_PATHS, ROUTES, SITE_ORIGIN, canonicalFor, headTagsFor, organizationJsonLd } =
  await import(pathToFileURL(serverEntry).href);

const template = await readFile(join(dist, 'index.html'), 'utf8');

if (!template.includes(HEAD_OPEN) || !template.includes(HEAD_CLOSE)) {
  log('FAILED: index.html is missing the prerender:head markers.');
  process.exit(1);
}
if (!/<div id="root"><\/div>/.test(template)) {
  log('FAILED: index.html has no empty <div id="root"></div> to fill.');
  process.exit(1);
}

const buildPage = (pathname, html) => {
  const head = template
    .replace(
      new RegExp(`${HEAD_OPEN}[\\s\\S]*?${HEAD_CLOSE}`),
      [
        HEAD_OPEN,
        `    ${headTagsFor(pathname)}`,
        `    <script type="application/ld+json">${organizationJsonLd()}</script>`,
        `    ${HEAD_CLOSE}`,
      ].join('\n')
    )
    // The prerendered markup goes inside the existing root div so the client
    // bundle finds the nodes it already expects. renderToString emits the
    // extra data attributes React uses to adopt server markup, and
    // hydrateRoot reads those rather than discarding the tree.
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

  return head;
};

// ------------------------------------------------------------------ pages ---
for (const pathname of PRERENDER_PATHS) {
  const { html } = await render(pathname);
  const page = buildPage(pathname, html);
  const outDir = pathname === '/' ? dist : join(dist, pathname.replace(/^\//, ''));
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.html'), page, 'utf8');
  log(`${pathname.padEnd(12)} ${(Buffer.byteLength(page) / 1024).toFixed(1).padStart(7)} kB`);
}

// ---------------------------------------------------------------- sitemap ---
// Built from the same ROUTES table the pages and meta tags come from, so a new
// page cannot be half-added.
const urls = ROUTES.filter((route) => !route.noindex)
  .map(
    (route) => `  <url>
    <loc>${canonicalFor(route.path)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join('\n');

await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
  'utf8'
);
log(`sitemap.xml  ${ROUTES.filter((r) => !r.noindex).length} urls`);

// ----------------------------------------------------------------- robots ---
await writeFile(
  join(dist, 'robots.txt'),
  `User-agent: *
Allow: /

# Workspaces and auth screens hold no indexable content and are behind a login.
# The API must never be crawled.
Disallow: /admin
Disallow: /trainer
Disallow: /finance
Disallow: /secretary
Disallow: /dashboard
Disallow: /profile
Disallow: /account
Disallow: /login
Disallow: /signup
Disallow: /api/

# /apply is deliberately NOT disallowed. It is a public conversion page - it needs
# no login - and it is listed in sitemap.xml alongside /team, /news and /contact,
# which are likewise public. Listing a URL in the sitemap while also disallowing it is a contradiction: crawlers drop the sitemap
# entry and treat the disallow as authoritative. The robots file now matches what
# the sitemap already said.

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`,
  'utf8'
);
log('robots.txt');

log(`done, origin ${SITE_ORIGIN}`);