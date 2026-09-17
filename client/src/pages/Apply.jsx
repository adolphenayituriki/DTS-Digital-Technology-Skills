import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Calendar, Users, Clock, CheckCircle, Check, ArrowRight, ArrowLeft, XCircle } from 'lucide-react';
import apiFetch from '../api';
import FadeIn from '../components/FadeIn';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';

const STEPS = ['Personal Info', 'Contact', 'Course', 'Review'];

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function Apply() {
  const [searchParams] = useSearchParams();
  const { user, isLoggedIn } = useAuth();
  const toast = useToast();
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    campus: '',
    preferred: searchParams.get('program') ? [searchParams.get('program')] : [],
    motivation: '',
  });
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    apiFetch('/intakes')
      .then((d) => setIntakes(Array.isArray(d) ? d : []))
      .catch(() => setIntakes([]))
      .finally(() => setLoading(false));
  }, []);

  const openForm = (intake) => {
    const fromParam = searchParams.get('program');
    const courses = Array.isArray(intake.courses) ? intake.courses : [];
    setForm((f) => ({
      ...f,
      preferred: courses.includes(fromParam) ? [fromParam] : [],
    }));
    setSelected(intake);
    setStep(1);
  };

  const isDeadlinePassed = (intake) => intake.deadline && new Date(intake.deadline) < new Date();
  const isFull = (intake) => intake.status === 'full' || intake.enrolled >= intake.capacity;
  const canApply = (intake) => intake.status === 'open' && !isDeadlinePassed(intake) && !isFull(intake);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const nextStep = () => {
    if (step === 1 && (!form.name.trim() || !form.email.trim())) {
      toast.error('Please fill in your name and email.');
      return;
    }
    if (step === 3 && form.preferred.length === 0) {
      toast.error('Please select at least one preferred course.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const toggleCourse = (c) =>
    setForm((f) => ({
      ...f,
      preferred: f.preferred.includes(c) ? f.preferred.filter((x) => x !== c) : [...f.preferred, c],
    }));

  const backStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Please fill in your name and email.');
      return;
    }
    setSending(true);
    try {
      await apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({
          intakeId: selected._id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          campus: form.campus,
          motivation: form.motivation,
          preferredCourses: form.preferred,
          program: form.preferred.join(', '),
        }),
      });
      toast.success('Application submitted!', { title: 'You are in the queue 🎉', duration: 5000 });
      setForm((f) => ({
        name: isLoggedIn ? user.name : '',
        email: isLoggedIn ? user.email : '',
        phone: '',
        campus: '',
        preferred: [],
        motivation: '',
      }));
      setSelected(null);
      setStep(1);
    } catch (err) {
      toast.error(err.message || 'Failed to submit application.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>Apply for an Intake</h1>
          <p>Choose an open intake and submit your application in minutes</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && <div className="loading"><div className="spinner" />Loading intakes...</div>}

          {!loading && intakes.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>
                No open intakes at the moment. Check back soon or contact us for more information.
              </p>
              <Link to="/contact" className="btn btn-primary">Contact Us</Link>
            </div>
          )}

          <div className="grid-3">
            {!selected && intakes.map((intake) => {
              const deadlinePassed = isDeadlinePassed(intake);
              const full = isFull(intake);
              const open = canApply(intake);
              const pct = Math.min(100, Math.round(((intake.enrolled || 0) / intake.capacity) * 100));
              return (
                <FadeIn key={intake._id}>
                  <div className={`card intake-card ${open ? '' : 'intake-closed'}`}>
                    <div className="intake-card-head">
                      <h3>{intake.title}</h3>
                      <span className={`intake-status ${open ? '' : 'danger'}`}>
                        {full ? 'Full' : deadlinePassed ? 'Closed' : intake.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    {intake.description && <p className="intake-desc">{intake.description}</p>}
                    {Array.isArray(intake.courses) && intake.courses.length > 0 && (
                      <div className="intake-courses">
                        {intake.courses.map((c) => (
                          <span key={c} className="intake-course-chip">{c}</span>
                        ))}
                      </div>
                    )}
                    <div className="intake-meta">
                      {intake.startDate && (
                        <span><Calendar size={13} /> Starts {fmtDate(intake.startDate)}</span>
                      )}
                      {intake.deadline && (
                        <span><Clock size={13} /> Deadline {fmtDate(intake.deadline)}</span>
                      )}
                      <span><Users size={13} /> {intake.enrolled || 0} / {intake.capacity || '—'} enrolled</span>
                    </div>
                    <div className="intake-bar">
                      <div className="intake-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    {open ? (
                      <button className="btn btn-primary btn-sm intake-btn" onClick={() => openForm(intake)}>
                        Apply Now <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button className="btn btn-outline btn-sm intake-btn" disabled>
                        <XCircle size={14} /> {full ? 'Capacity Full' : 'Applications Closed'}
                      </button>
                    )}
                  </div>
                </FadeIn>
              );
            })}
          </div>

          {selected && (
            <FadeIn>
              <div className="apply-form-border">
                <div className="card apply-form-card">
                  <div className="apply-form-head">
                    <div>
                      <h3>Apply for {selected.title}</h3>
                      <p className="apply-form-sub">
                        {selected.program} level — Deadline {fmtDate(selected.deadline)} · {selected.enrolled || 0}/{selected.capacity || '—'} enrolled
                      </p>
                    </div>
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => { setSelected(null); setStep(1); }}>
                      <ArrowLeft size={13} /> Change level
                    </button>
                  </div>
                  {!isLoggedIn && (
                    <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      Applying as a guest.
                      <Link to="/signup" style={{ fontWeight: 700, color: 'var(--primary)' }}>Sign up</Link> or
                      <Link to="/login" style={{ fontWeight: 700, color: 'var(--primary)' }}>log in</Link> to track your application.
                    </div>
                  )}
                  <ol className="apply-steps">
                    {STEPS.map((label, i) => {
                      const n = i + 1;
                      const done = step > n;
                      const active = step === n;
                      return (
                        <li key={label} className={`${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}>
                          <span className="apply-step-num">{done ? <Check size={13} /> : n}</span>
                          <span className="apply-step-label">{label}</span>
                        </li>
                      );
                    })}
                  </ol>

                  <form onSubmit={handleSubmit}>
                    {step === 1 && (
                      <div className="step-body">
                        <p className="step-hint">Tell us who you are so we can identify your application.</p>
                        <div className="grid-2">
                          <div className="form-group">
                            <label>Full Name *</label>
                            <input name="name" className="form-control" value={form.name} onChange={handleChange} placeholder="Your full name" required />
                          </div>
                          <div className="form-group">
                            <label>Email *</label>
                            <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="step-body">
                        <p className="step-hint">How can we reach you? Your campus helps us plan your training.</p>
                        <div className="grid-2">
                          <div className="form-group">
                            <label>Phone Number</label>
                            <input name="phone" className="form-control" value={form.phone} onChange={handleChange} placeholder="+250 7xx xxx xxx" />
                          </div>
                          <div className="form-group">
                            <label>Campus / Location</label>
                            <input name="campus" className="form-control" value={form.campus} onChange={handleChange} placeholder="e.g. UR-Huye" />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="step-body">
                        <p className="step-hint">Select one or more preferred courses for the {selected.program} level.</p>
                        <div className="form-group">
                          <label>Preferred Courses *</label>
                          <div className="course-options">
                            {(Array.isArray(selected.courses) && selected.courses.length > 0 ? selected.courses : [selected.program]).map((c) => (
                              <label key={c} className={`course-option ${form.preferred.includes(c) ? 'is-selected' : ''}`}>
                                <input type="checkbox" checked={form.preferred.includes(c)} onChange={() => toggleCourse(c)} />
                                <span className="course-checkbox">{form.preferred.includes(c) && <Check size={12} />}</span>
                                <span>{c}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Why do you want to join? (optional)</label>
                          <textarea name="motivation" className="form-control" rows={3} value={form.motivation} onChange={handleChange} placeholder="Tell us a bit about your goals and motivation..." />
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div className="step-body">
                        <p className="step-hint">Review your details before submitting.</p>
                        <div className="apply-review">
                          <div className="apply-review-row"><span>Intake</span><strong>{selected.title}</strong></div>
                          <div className="apply-review-row"><span>Level</span><strong>{selected.program}</strong></div>
                          <div className="apply-review-row"><span>Course</span><strong>{form.preferred.join(', ') || '—'}</strong></div>
                          <div className="apply-review-row"><span>Full Name</span><strong>{form.name}</strong></div>
                          <div className="apply-review-row"><span>Email</span><strong>{form.email}</strong></div>
                          <div className="apply-review-row"><span>Phone</span><strong>{form.phone || '—'}</strong></div>
                          <div className="apply-review-row"><span>Campus</span><strong>{form.campus || '—'}</strong></div>
                          {form.motivation && <div className="apply-review-row"><span>Motivation</span><strong>{form.motivation}</strong></div>}
                        </div>
                      </div>
                    )}

                    <div className="apply-form-nav">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSelected(null); setStep(1); }}>
                        Cancel
                      </button>
                      <div className="apply-form-nav-right">
                        {step > 1 && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={backStep}>
                            <ArrowLeft size={14} /> Back
                          </button>
                        )}
                        {step < STEPS.length ? (
                          <button type="button" className="btn btn-primary btn-sm" onClick={nextStep}>
                            Continue <ArrowRight size={14} />
                          </button>
                        ) : (
                          <button type="submit" className="btn btn-success btn-sm" disabled={sending}>
                            <CheckCircle size={14} /> {sending ? 'Submitting...' : 'Submit Application'}
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </FadeIn>
          )}
        </div>
      </section>
    </>
  );
}