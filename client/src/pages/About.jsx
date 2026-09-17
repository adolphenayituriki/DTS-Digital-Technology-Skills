import React from 'react';
import { Users, GraduationCap, Handshake, Target, Eye, Award, Clock, BadgeCheck, School, HeartHandshake } from 'lucide-react';
import FadeIn from '../components/FadeIn';

export default function About() {
  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>Digital Technology Skills</h1>
          <p>Association — Empowering students and communities with digital literacy since 2022</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="about-intro">
            <FadeIn direction="right">
              <h2 style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.03em' }}>
                <span className="icon-circle blue">
                  <Users size={18} />
                </span>
                What is DTS?
              </h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '1rem', lineHeight: 1.8 }}>
                Digital Technology Skills is an association that was established in September 2022 at
                UR-Huye Campus, aimed at promoting the learning and use of digital technology,
                empowering members with computer skills, encouraging innovation, and focusing on
                solving real-life problems using technology.
              </p>
              <p style={{ color: 'var(--text-light)', lineHeight: 1.8 }}>
                We are a student-led initiative that supports both new and continuing students,
                particularly those who may not yet possess digital skills.
              </p>
            </FadeIn>
            <FadeIn direction="left" delay={150}>
              <div className="photo-fill">
                <img src="/activity-2.jpg" alt="DTS Team" loading="lazy" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <FadeIn>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <span className="icon-circle cyan">
                <GraduationCap size={18} />
              </span>
              <h2 style={{ fontWeight: 800, letterSpacing: '-0.03em' }}>How Does It Work?</h2>
            </div>
          </FadeIn>

          <div className="grid-3">
            {[
              { title: 'Foundational Training', desc: 'We enhance computer literacy with training in Google services, Microsoft Office, and online job applications — building a solid digital foundation for beginners.' },
              { title: 'Advanced Skills', desc: 'For those ready to go further, we offer photo and video editing, computer maintenance, and computer graphics — preparing students for professional creative and technical work.' },
              { title: 'Community Outreach', desc: 'Beyond campus, we collaborate with sector and village leaders to train local citizens on basic digital knowledge — such as Irembo and other government services accessed online.' },
            ].map((c, i) => (
              <FadeIn key={c.title} delay={i * 150}>
                <div className="card">
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={250}>
            <div className="info-strip">
              {[
                { icon: <Clock size={20} />, title: '2–3 Months', desc: 'Training cycle on campus' },
                { icon: <BadgeCheck size={20} />, title: 'Certified', desc: 'Certificate after completion' },
                { icon: <School size={20} />, title: '200+ Students', desc: 'Trained and certified since 2022' },
                { icon: <HeartHandshake size={20} />, title: 'Community', desc: 'With sectors & village leaders' },
              ].map((s) => (
                <div className="info-strip-item" key={s.title}>
                  <div className="info-strip-icon">{s.icon}</div>
                  <div>
                    <b>{s.title}</b>
                    <small>{s.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <FadeIn>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <span className="icon-circle navy">
                <Handshake size={18} />
              </span>
              <h2 style={{ fontWeight: 800, letterSpacing: '-0.03em' }}>Collaboration and Leadership</h2>
            </div>
          </FadeIn>
          <div className="grid-2">
            <FadeIn direction="up">
              <div className="card">
                <h3>Skills Beyond Technology</h3>
                <p>
                  Through our learning, we encourage teamwork, project management, and leadership
                  skills. Every training cycle is an opportunity to practice collaborative
                  problem-solving.
                </p>
              </div>
            </FadeIn>
            <FadeIn direction="up" delay={150}>
              <div className="card">
                <h3>Partnerships & Guest Talks</h3>
                <p>
                  We host guest talks and career days with ICT professionals, and we work with other
                  campuses, NGOs, and tech companies through partnerships — connecting our members
                  with real-world insights and opportunities.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="mission-vision">
            <FadeIn direction="right">
              <div className="card" style={{ borderLeft: '3px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Target size={20} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Our Mission</h3>
                </div>
                <p style={{ lineHeight: 1.8 }}>
                  Our primary objective is to enhance computer literacy among the society and
                  prepare a skilled workforce ready to thrive in the digital economy.
                </p>
              </div>
            </FadeIn>
            <FadeIn direction="left" delay={150}>
              <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Eye size={20} color="var(--accent)" />
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Our Vision</h3>
                </div>
                <p style={{ lineHeight: 1.8 }}>
                  To become a leading community-based training hub that empowers youth and residents
                  through accessible, high-quality technology education, bridging the digital divide
                  and promoting innovation.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-3">
            {[
              { icon: <Award size={20} />, title: 'Certified Training', desc: 'Every graduate receives a certificate of completion after finishing the curriculum.' },
              { icon: <Users size={20} />, title: '200+ Graduates', desc: 'Over 200 students trained and certified since September 2022 with practical skills.' },
              { icon: <GraduationCap size={20} />, title: 'Peer Learning', desc: 'Student-led model ensures accessible, relatable, and effective training for all.' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 150}>
                <div className="card text-center">
                  <div className="card-icon blue" style={{ margin: '0 auto 1rem' }}>{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}