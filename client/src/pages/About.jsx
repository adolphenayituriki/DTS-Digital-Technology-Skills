import React from 'react';
import { Users, Layers, Sparkles, Globe, Clock, BadgeCheck, School, HeartHandshake, Handshake, Target, Eye, Rocket } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const steps = [
  {
    n: '01',
    icon: <Layers size={22} />,
    title: 'Foundational Training',
    desc: 'Computer literacy in Google services, Microsoft Office, and online job applications. A solid digital foundation for beginners.',
  },
  {
    n: '02',
    icon: <Sparkles size={22} />,
    title: 'Advanced Skills',
    desc: 'Photo and video editing, computer maintenance, and computer graphics. Preparing students for professional creative and technical work.',
  },
  {
    n: '03',
    icon: <Globe size={22} />,
    title: 'Community Outreach',
    desc: 'Working with sector and village leaders to train local citizens on Irembo and other digital government services accessed online.',
  },
];

const stats = [
  { icon: <Clock size={20} />, value: '2–3 Months', label: 'Training cycle on campus' },
  { icon: <BadgeCheck size={20} />, value: 'Certified', label: 'Certificate after completion' },
  { icon: <School size={20} />, value: '200+', label: 'Trained & certified since 2022' },
  { icon: <HeartHandshake size={20} />, value: 'Community', label: 'With sectors & village leaders' },
];

export default function About() {
  return (
    <div className="about-page">
      <section className="page-header">
        <div className="container">
          <h1>Digital Technology Skills</h1>
          <p>Empowering students and communities with digital literacy since 2022</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="about-intro">
            <FadeIn direction="right">
              <span className="eyebrow">About the association</span>
              <h2 className="section-title">What is DTS?</h2>
              <p className="lead-text">
                Digital Technology Skills is a student-led association established in September 2022 at
                UR-Huye Campus. We promote digital learning, empower members with practical computer skills,
                encourage innovation, and focus on solving real-life problems with technology.
              </p>
              <p className="lead-text">
                We support both new and continuing students. Especially those who don't yet have digital
                skills. Through accessible, hands-on training.
              </p>
              <div className="ms-icon-row">
                <span className="icon-chip"><Users size={15} /> Student-led</span>
                <span className="icon-chip"><Rocket size={15} /> Est. 2022</span>
              </div>
            </FadeIn>
<FadeIn direction="left" delay={150}>
                <div className="about-media">
                  <div className="photo-fill">
                    <img src="/Graduation images/ELITEFRAMSTUDIO(93).jpg" alt="DTS Team at UR-Huye Campus" loading="lazy" />
                  </div>
                  <div className="photo-cap">DTS Team · UR-Huye Campus</div>
                </div>
              </FadeIn>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Our approach</span>
            <h2 className="section-title">How It Works</h2>
            <p>Three complementary tracks take students from digital basics to advanced skills and community impact.</p>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 150}>
                <div className="feature-card">
                  <div className="feature-top">
                    <span className="feature-num">{s.n}</span>
                    <div className="feature-icon">{s.icon}</div>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={250}>
            <div className="stats-band">
              {stats.map((s) => (
                <div className="stats-band-item" key={s.value}>
                  <div className="stats-band-icon">{s.icon}</div>
                  <div>
                    <b>{s.value}</b>
                    <small>{s.label}</small>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Beyond the classroom</span>
            <h2 className="section-title">Collaboration and Leadership</h2>
            <p>Technology is our tool; people and partnerships are our strength.</p>
          </div>
          <div className="grid-2">
            <FadeIn direction="up">
              <div className="card leader-card">
                <div className="leader-icon cyan"><Handshake size={20} /></div>
                <h3>Skills Beyond Technology</h3>
                <p>
                  Every training cycle builds teamwork, project management, and leadership, turning
                  learning into collaborative problem-solving.
                </p>
              </div>
            </FadeIn>
            <FadeIn direction="up" delay={150}>
              <div className="card leader-card">
                <div className="leader-icon blue"><Users size={20} /></div>
                <h3>Partnerships & Guest Talks</h3>
                <p>
                  ICT professionals share real-world insights through guest talks and career days, backed
                  by partnerships with campuses, NGOs, and tech companies.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head mv-head">
            <span className="eyebrow">Guiding principles</span>
            <h2 className="section-title">Mission & Vision</h2>
          </div>
          <div className="mv-grid">
            <FadeIn direction="up">
              <div className="mv-panel mission">
                <div className="mv-panel-head">
                  <span className="mv-panel-icon"><Target size={20} /></span>
                  <h3>Our Mission</h3>
                </div>
                <div className="mv-panel-body">
                  <p>
                    Enhance computer literacy across society and prepare a skilled workforce ready to
                    thrive in the digital economy.
                  </p>
                </div>
              </div>
            </FadeIn>
            <FadeIn direction="up" delay={150}>
              <div className="mv-panel vision">
                <div className="mv-panel-head">
                  <span className="mv-panel-icon"><Eye size={20} /></span>
                  <h3>Our Vision</h3>
                </div>
                <div className="mv-panel-body">
                  <p>
                    A leading community-based training hub that empowers youth and residents through
                    accessible, high-quality tech education. Bridging the digital divide.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}