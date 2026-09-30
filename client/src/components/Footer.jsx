import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Handshake } from 'lucide-react';

// Both marks are square/rectangular files with non-square aspect ratios, so they
// are shown inside a fixed circle with `object-fit: cover` - the same treatment
// the login form gives the DTS logo, and the only way a rectangular bitmap looks
// deliberate in a round badge.
const CircleLogo = ({ src, alt, className = '', size = 64 }) => (
  <span className={`circle-logo ${className}`.trim()} style={{ '--logo-size': `${size}px` }}>
    <img src={src} alt={alt} loading="lazy" decoding="async" />
  </span>
);

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <CircleLogo src="/Logo.png" alt="Digital Technology Skills logo" className="circle-logo-dts" />
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
              <li><Link to="/programs">Photo &amp; Video Editing</Link></li>
              <li><Link to="/programs">Computer Maintenance</Link></li>
              <li><Link to="/programs">Computer Graphics</Link></li>
              <li><Link to="/programs">Online Job Applications</Link></li>
            </ul>
          </div>

          <div>
            <h4>Contact Info</h4>
            <ul>
              <li className="footer-contact-row">
                <MapPin size={16} aria-hidden="true" />
                <span>UR-Huye Campus, Huye District, Southern Province, Rwanda</span>
              </li>
              <li className="footer-contact-row">
                <Mail size={16} aria-hidden="true" />
                <a href="mailto:digitaltechnologyskills1yahoo@gmail.com">digitaltechnologyskills1yahoo@gmail.com</a>
              </li>
              <li className="footer-contact-row">
                <Phone size={16} aria-hidden="true" />
                <a href="tel:+250780505948">+250 780 505 948</a>
              </li>
            </ul>

            <div className="footer-partner">
              <CircleLogo
                src="/ur%20logo.jpg"
                alt="University of Rwanda logo"
                className="circle-logo-ur"
                size={52}
              />
              <div>
                <span className="footer-partner-label">
                  <Handshake size={12} /> Huye Campus partner
                </span>
                <b>University of Rwanda</b>
                <small>Huye Campus</small>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Digital Technology Skills (DTS). All rights reserved.</p>
          <span className="footer-campus-note">Training delivered at UR-Huye Campus, Rwanda</span>
        </div>
      </div>
    </footer>
  );
}
