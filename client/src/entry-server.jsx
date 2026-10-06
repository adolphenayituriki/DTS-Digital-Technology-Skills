import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { StaticRouter } from 'react-router-dom/server';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './components/Toast';
import { AppShell } from './App';
import { PRERENDER_PATHS } from './seo';
import { preloadRoutes } from './lazyRoute';

// Vite folds this small module into the entry bundle rather than emitting it as
// its own chunk, so the prerender script cannot import it by path. Re-exporting
// keeps the script's single import surface at this file.
export {
  PRERENDER_PATHS,
  ROUTES,
  SITE_ORIGIN,
  canonicalFor,
  headTagsFor,
  organizationJsonLd,
} from './seo';

// Mirrors the route table: / renders the eagerly-imported Home, every other
// prerendered path maps to its page component's registered lazy name.
// preloadRoutes ignores names it does not know, so an unmapped path is harmless.
const routeNamesFor = (path) =>
  path === '/' ? [] : [path.replace(/^\//, '').replace(/\//g, '')];

// Effects do not run on the server, so a component that fetches its data in
// useEffect never resolves its Suspense boundary here and onAllReady would wait
// forever. That is why PRERENDER_PATHS is limited to fully static pages, and the
// timeout below exists so a future route that breaks that rule fails the build
// loudly instead of hanging it.
const RENDER_TIMEOUT_MS = 15000;

export async function render(url) {
  // Get the code-split chunks in memory first, so the stream does not emit a
  // fallback while a dynamic import is still in flight.
  await preloadRoutes(routeNamesFor(url));

  return new Promise((resolve, reject) => {
    const tree = (
      <StaticRouter location={url}>
        <AuthProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </AuthProvider>
      </StaticRouter>
    );

    let settled = false;
    const finish = (html) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ html });
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    const timer = setTimeout(
      () => fail(new Error(`Prerender of ${url} timed out after ${RENDER_TIMEOUT_MS}ms. A Suspense boundary never resolved - most likely a page that fetches data in useEffect was added to PRERENDER_PATHS.`)),
      RENDER_TIMEOUT_MS
    );

    const collect = (stream) =>
      new Promise((done, error) => {
        const body = new PassThrough();
        const chunks = [];
        body.on('data', (chunk) => chunks.push(chunk));
        body.on('end', () => done(Buffer.concat(chunks).toString('utf8')));
        body.on('error', error);
        stream.pipe(body);
      });

    const stream = renderToPipeableStream(tree, {
      // onAllReady, not onShellReady: the shell only contains the Suspense
      // fallback, which is exactly what we are trying to avoid shipping. This
      // fires once every boundary has produced its real content.
      onAllReady() {
        collect(stream).then(finish, fail);
      },
      onShellError: fail,
      onError(error) {
        // A boundary-level error still streams a fallback for that boundary, so
        // it is surfaced rather than thrown - the page is written, but the
        // problem is visible in the build log instead of only in the output.
        process.stderr.write(`[prerender] render error on ${url}: ${error?.message}\n`);
      },
    });
  });
}