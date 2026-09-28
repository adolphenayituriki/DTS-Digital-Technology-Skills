import React from 'react';

export default function RouteFallback() {
  return (
    <div className="loading">
      <div className="spinner" />
      Loading...
    </div>
  );
}
