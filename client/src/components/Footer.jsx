import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <img src="/Logo.png" alt="DTS Logo" className="footer-logo" />
            <p>
              Empowering students and communities through accessible technology
              education and digital literacy training at UR-Huye Campus.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Facebook"><Facebook /></a>
              <a href="#" aria-label="Twitter"><Twitter /></a>
              <a href="#" aria-label="LinkedIn"><Linkedin /></a>
              <a href="#" aria-label="Instagram"><Instagram /></a>
            </div>
          </div>

          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/programs">Programs</Link></li>
              <li><Link to="/team">Our Team</Link></li>
              <li><Link to="/news">News</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/profile">Student Profile</Link></li>
            </ul>
          </div>

          <div>
            <h4>Programs</h4>
            <ul className="footer-links-2">
              <li><Link to="/programs">Google Services</Link></li>
              <li><Link to="/programs">Microsoft Office</Link></li>
              <li><Link to="/programs">Photo & Video Editing</Link></li>
              <li><Link to="/programs">Computer Maintenance</Link></li>
              <li><Link to="/programs">Computer Graphics</Link></li>
              <li><Link to="/programs">Online Job Applications</Link></li>
            </ul>
          </div>

          <div>
            <h4>Contact Info</h4>
            <ul>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <MapPin size={16} style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <span>UR-Huye Campus, Huye District, Southern Province, Rwanda</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Mail size={16} />
                <a href="mailto:info@dts-rwanda.org">info@dts-rwanda.org</a>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} />
                <a href="tel:+250780505948">+250 780 505 948</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Digital Technology Skills (DTS). All rights reserved.</p>
          <img
            src="/ur%20logo.jpg"
            alt="UR-Huye Campus"
            className="footer-ur-logo"
            width="240"
            height="210"
            loading="lazy"
          />
        </div>
      </div>
    </footer>
  );
}
