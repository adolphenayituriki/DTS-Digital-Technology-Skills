import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './AuthContext';
import registerServiceWorker from './registerSW';
import './styles/global.css';

const container = document.getElementById('root');

const app = (
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

// Routes listed in PRERENDER_PATHS arrive with their markup already inside
// #root. Hydrating keeps that markup on screen instead of discarding and
// rebuilding it. An empty container means there is nothing to hydrate - the dev
// server, or a route with no prerendered file - so render normally instead.
if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, app);
} else {
  ReactDOM.createRoot(container).render(app);
}

// After first paint: the worker is what keeps the site open offline.
registerServiceWorker();
