import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import apiFetch from '../api';
import FadeIn from '../components/FadeIn';
import { useToast } from '../components/Toast';

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSending(true);
    try {
      await apiFetch('/messages', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Message sent! We will get back to you soon.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      toast.error('Failed to send message. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>Contact Us</h1>
          <p>Have questions? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <FadeIn direction="right">
              <div>
                <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Send Us a Message</h2>
                <form onSubmit={handleSubmit}>
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input id="name" name="name" className="form-control" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input id="email" name="email" type="email" className="form-control" value={form.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" name="phone" className="form-control" value={form.phone} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subject">Subject</label>
                    <input id="subject" name="subject" className="form-control" value={form.subject} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea id="message" name="message" className="form-control" rows={5} value={form.message} onChange={handleChange} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  <Send size={18} />
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
              </div>
            </FadeIn>

            <FadeIn direction="left" delay={150}>
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Get in Touch</h2>
              <div className="contact-info-card">
                <div className="icon-wrap"><MapPin size={20} /></div>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>Address</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>UR-Huye Campus, Huye District, Southern Province, Rwanda</p>
                </div>
              </div>
              <div className="contact-info-card">
                <div className="icon-wrap"><Mail size={20} /></div>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>Email</h4>
                  <a href="mailto:info@dts-rwanda.org" style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>info@dts-rwanda.org</a>
                </div>
              </div>
              <div className="contact-info-card">
                <div className="icon-wrap"><Phone size={20} /></div>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>Phone</h4>
                  <a href="tel:+250780505948" style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>+250 780 505 948</a>
                </div>
              </div>
              <div className="map-placeholder mt-3">
                <MapPin size={28} />
                <span>UR-Huye Campus, Huye District</span>
              </div>
            </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
