import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const programs = [
  { title: 'Google Services', desc: 'Master Gmail, Google Drive, Google Docs, Sheets, Slides, and the full Google Workspace ecosystem. Learn cloud-based collaboration and productivity tools used by millions worldwide.', duration: '2-3 months', color: 'blue' },
  { title: 'Microsoft Office', desc: 'Comprehensive training in Word, Excel, PowerPoint, and Outlook. From basic document creation to advanced spreadsheet formulas and professional presentations.', duration: '2-3 months', color: 'cyan' },
  { title: 'Online Job Applications', desc: 'Learn to navigate online job portals, create compelling CVs and cover letters, build professional LinkedIn profiles, and apply for opportunities effectively.', duration: '2-3 months', color: 'green' },
  { title: 'Photo & Video Editing', desc: 'Create stunning visual content using Adobe Photoshop, Premiere Pro, and free alternatives like GIMP and DaVinci Resolve. Perfect for aspiring creatives.', duration: '2-3 months', color: 'amber' },
  { title: 'Computer Maintenance', desc: 'Hardware troubleshooting, software installation, virus removal, system optimization, and basic networking. Keep computers running at peak performance.', duration: '2-3 months', color: 'blue' },
  { title: 'Computer Graphics', desc: 'Explore graphic design principles, logo creation, branding materials, and digital illustration using tools like Adobe Illustrator and Canva.', duration: '2-3 months', color: 'cyan' },
];

const colorMap = {
  blue: { bg: '#f0f7fb', color: '#1a6b91' },
  cyan: { bg: '#f0f9f1', color: '#2d8f3d' },
  green: { bg: '#f0fdf4', color: '#166534' },
  amber: { bg: '#fefce8', color: '#a16207' },
};

export default function Programs() {
  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>Our Programs</h1>
          <p>Comprehensive digital skills training for students and community members</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p style={{ textAlign: 'center', color: 'var(--text-light)', maxWidth: 700, margin: '0 auto 3rem', fontSize: '1.05rem' }}>
            All training programs run for 2-3 months on UR-Huye Campus. Each program includes
            hands-on practice, real-world projects, and a certificate of completion.
          </p>
          <div className="grid-3">
            {programs.map((p, i) => {
              const c = colorMap[p.color];
              const slug = encodeURIComponent(p.title);
              return (
                <FadeIn key={i} delay={(i % 3) * 100}>
                  <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.15rem' }}>{p.title}</h3>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 999, background: c.bg, color: c.color, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                        {p.duration}
                      </span>
                    </div>
                    <p style={{ flex: 1 }}>{p.desc}</p>
                    <Link to={`/apply?program=${slug}`} className="btn btn-outline btn-sm" style={{ marginTop: '1.5rem', alignSelf: 'flex-start' }}>
                      Apply Now <ArrowRight size={14} />
                    </Link>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container text-center">
          <h2 style={{ fontWeight: 800, marginBottom: '1rem' }}>Ready to Start Learning?</h2>
          <p style={{ color: 'var(--text-light)', maxWidth: 500, margin: '0 auto 2rem' }}>
            Join our next training cycle and gain skills that will prepare you for the digital economy.
          </p>
          <Link to="/apply" className="btn btn-primary">
            Apply Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
