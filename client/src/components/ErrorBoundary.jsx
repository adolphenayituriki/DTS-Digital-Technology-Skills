import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// React reports a failed render to the nearest error boundary, and the most
// common failure here is a route chunk that could not be downloaded because the
// connection dropped mid-navigation. Without a boundary the whole tree
// unmounts to a white screen, which tells the user nothing.
export default class ErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Console only: this is where the real cause survives for anyone debugging
    // with dev tools open.
    console.warn('Page failed to render:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    // `window` guards the build-time render; see OfflineBanner for why
    // navigator alone is unreliable here.
    const offline = typeof window !== 'undefined' && window.navigator.onLine === false;
    return (
      <div className="route-error" role="alert">
        <span className="route-error-icon"><AlertTriangle size={20} /></span>
        <h2>{offline ? 'You are offline' : 'This page could not be loaded'}</h2>
        <p>
          {offline
            ? 'The connection dropped before this page finished loading. Reconnect and try again - pages you already opened still work.'
            : 'Something went wrong while rendering this page. Reloading usually fixes it.'}
        </p>
        <div className="route-error-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Reload
          </button>
        </div>
      </div>
    );
  }
}
