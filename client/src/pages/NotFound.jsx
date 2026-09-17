import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="notfound">
      <div className="container">
        <div className="card notfound-card">
          <span className="notfound-code">404</span>
          <h1>Page Not Found</h1>
          <p>
            The page you are looking for doesn't exist or may have been moved.
            Let's get you back on track.
          </p>
          <div className="notfound-actions">
            <Link to="/" className="btn btn-primary">
              <Home size={16} /> Back to Home
            </Link>
            <Link to="/contact" className="btn btn-secondary">
              <ArrowLeft size={16} /> Contact Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}