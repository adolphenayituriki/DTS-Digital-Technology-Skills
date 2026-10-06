import { lazy } from 'react';

// React.lazy with the loader kept addressable by name.
//
// The client only ever downloads a page chunk when it navigates there, and that
// must stay true - eagerly importing the six prerendered public pages would add
// roughly 25 kB of About/Programs/Gallery/Privacy/Terms to the bundle that every
// dashboard load pays for.
//
// The prerenderer needs the opposite: it has to have those modules in hand
// before it calls renderToString, because renderToString is synchronous and
// cannot await a pending import. Registering the loader under a name lets the
// server entry await exactly the pages it is about to render, and nothing else.
//
// The memo means calling the loader is idempotent, so preloading a route that
// was already visited costs nothing and React's lazy payload is shared.

const loaders = new Map();

export const lazyRoute = (name, loader) => {
  let pending = null;
  const load = () => (pending || (pending = loader()));
  loaders.set(name, load);
  return lazy(load);
};

export const preloadRoutes = (names) =>
  Promise.all(
    names.map((name) => {
      const load = loaders.get(name);
      return load ? load() : null;
    })
  );