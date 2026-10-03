import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, Check, ArrowRight, ArrowLeft, XCircle, GraduationCap, CheckCircle2, Share2, Info, UploadCloud, FileCheck2, Trash2, CreditCard, Smartphone, Building2, Mail } from 'lucide-react';
import apiFetch from '../api';
import FadeIn from '../components/FadeIn';
import useAuth from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { emailProblem, normalizeEmail } from '../utils/email';
import { LEVELS_OF_STUDY, GENDERS, REG_NUMBER_PATTERN } from '../utils/options';
import { EARLY_PAYMENT_NOTICE, EARLY_PAYMENT_NOTICE_COMPACT } from '../utils/fees';

const BASE_STEPS = ['Personal Info', 'Contact', 'Studies'];

// Advanced entrants already hold the Basic certificate, so they get an extra
// step to prove it. The step list is derived rather than fixed, which keeps the
// stepper, the validation and the submit payload in agreement about how many
// steps there are.
const stepsFor = (isAdvanced) =>
  isAdvanced ? [...BASE_STEPS, 'Certificate', 'Review'] : [...BASE_STEPS, 'Review'];

const CERT_MAX_BYTES = 5 * 1024 * 1024;
const CERT_MAX_MB = CERT_MAX_BYTES / 1024 / 1024;
// Extensions as well as types: Windows and some phone galleries report an
// empty or generic type for a perfectly good photo, and the applicant's own
// ".png" that is really a JPEG is a valid certificate. The server checks the
// real bytes, so this only needs to catch the obviously wrong early.
const CERT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const CERT_EXTS = /\.(jpe?g|png|pdf)$/i;
const CERT_MIMES_AMBIGUOUS = ['', 'application/octet-stream', 'binary/octet-stream'];

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtBytes = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function Apply() {
  const [searchParams] = useSearchParams();
  const { intakeId } = useParams();
  const { user, isLoggedIn } = useAuth();
  const toast = useToast();
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [linkNotice, setLinkNotice] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    campus: '',
    regNumber: '',
    levelOfStudy: '',
    department: '',
    gender: '',
    preferred: searchParams.get('program') ? [searchParams.get('program')] : [],
    motivation: '',
  });
  const [certificate, setCertificate] = useState(null);
  const [certError, setCertError] = useState('');
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState(1);
  // Held after a successful submit so the applicant reads the next step
  // instead of being dropped straight back onto an empty intake list.
  const [submitted, setSubmitted] = useState(null);

  // The wizard, the intake grid and the receipt all swap in place inside one
  // long page, so the browser keeps whatever scroll offset the applicant had
  // reached. Advancing to step 2 would then open halfway down, hiding its own
  // heading and first fields - which reads as the form having skipped a page.
  // This anchor survives every one of those swaps, so it is the only thing that
  // has to be tracked. It is the top of the section rather than the top of the
  // form card, because after a submit the form is gone and the receipt - which
  // the applicant needs to read - sits at that same position.
  const anchorRef = useRef(null);
  // The anchor is on screen from the first paint, so without this the effect
  // would jump the page past its own header before the applicant had scrolled
  // anywhere. Only transitions the applicant caused should move them.
  const isFirstRender = useRef(true);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, selected?._id, submitted]);

  // The level is a property of the intake the applicant picked, not something
  // they fill in - which is also what decides whether a certificate is needed.
  const isAdvanced = useMemo(
    () => /advanced/i.test(`${selected?.program || ''} ${selected?.title || ''}`),
    [selected],
  );
  const STEPS = useMemo(() => stepsFor(isAdvanced), [isAdvanced]);

  useEffect(() => {
    apiFetch('/intakes')
      .then((d) => setIntakes(Array.isArray(d) ? d : []))
      .catch(() => setIntakes([]))
      .finally(() => setLoading(false));
  }, []);

  const isDeadlinePassed = (intake) => intake.deadline && new Date(intake.deadline) < new Date();
  const isFull = (intake) => intake.status === 'full' || intake.enrolled >= intake.capacity;
  const canApply = (intake) => intake.status === 'open' && !isDeadlinePassed(intake) && !isFull(intake);

  const openForm = (intake) => {
    const fromParam = searchParams.get('program');
    const courses = Array.isArray(intake.courses) ? intake.courses : [];
    setForm((f) => ({
      ...f,
      preferred: courses.includes(fromParam) ? [fromParam] : [],
    }));
    // Switching intakes can flip whether a certificate applies, so any file
    // chosen for the previous intake is dropped rather than silently carried
    // over into an application it was not meant for.
    setCertificate(null);
    setCertError('');
    setSelected(intake);
    setSubmitted(null);
    setStep(1);
  };

  // A shared /apply/:intakeId link should land the visitor straight on that
  // intake's form instead of making them hunt for the right card.
  useEffect(() => {
    if (!intakeId || loading || selected) return;
    const match = intakes.find((i) => i._id === intakeId);
    if (!match) {
      setLinkNotice('This application link is no longer available. Please choose from the current intakes below.');
      return;
    }
    if (canApply(match)) {
      openForm(match);
    } else {
      setLinkNotice(
        isFull(match)
          ? `${match.title} is currently at full capacity. Please choose another intake below.`
          : `Applications for ${match.title} have closed. Please choose another intake below.`
      );
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [intakeId, loading, intakes]);

  const intakeShareUrl = (intake) => `${window.location.origin}/apply/${intake._id}`;

  const shareIntake = async (intake, event) => {
    event?.stopPropagation?.();
    const url = intakeShareUrl(intake);
    const shareData = {
      title: `${intake.title} - DTS`,
      text: intake.description || `Apply for ${intake.title} at DTS.`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // A cancelled share sheet is not an error worth reporting.
        if (err && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Application link copied to your clipboard.');
    } catch {
      toast.error('Could not copy the link. Please copy it from the address bar.');
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Only nag once the field has something in it, otherwise the empty form opens
  // with an error already showing. Applicants are issued a Gmail address for
  // their student profile, so the address must end in @gmail.com - but anything
  // before the @ is taken exactly as typed, so www.nayituriki.com@gmail.com is
  // accepted.
  const emailHint = form.email.trim() ? emailProblem(form.email, { requireGmail: true }) : '';
  const regHint = form.regNumber.trim() && !REG_NUMBER_PATTERN.test(form.regNumber.trim())
    ? 'Use the format 225020019, or leave blank if this is your first intake.'
    : '';

  // Checked before the file is ever sent, so a 5 MB rejection is instant
  // instead of costing the applicant the upload first.
  const acceptCertificate = (file) => {
    if (!file) return;
    const type = String(file.type || '').toLowerCase();
    const plausible =
      CERT_TYPES.includes(type) ||
      CERT_MIMES_AMBIGUOUS.includes(type) ||
      CERT_EXTS.test(file.name || '');
    if (!plausible) {
      setCertificate(null);
      setCertError('Certificate must be a JPG, PNG or PDF file.');
      return;
    }
    if (file.size > CERT_MAX_BYTES) {
      setCertificate(null);
      setCertError(`Certificate is too large. Maximum size is ${CERT_MAX_MB} MB.`);
      return;
    }
    setCertificate(file);
    setCertError('');
  };

  const nextStep = () => {
    if (step === 1 && (!form.name.trim() || !form.email.trim())) {
      toast.error('Please fill in your name and email.');
      return;
    }
    if (step === 1 && emailHint) {
      toast.error(emailHint, { title: 'Check your email address' });
      return;
    }
    if (step === 1 && regHint) {
      toast.error(regHint, { title: 'Check your registration number' });
      return;
    }
    if (step === 3 && form.preferred.length === 0) {
      toast.error('Please select at least one preferred course.');
      return;
    }
    // The Certificate step is index 4 when it exists, and the one before
    // Review when it does not.
    if (isAdvanced && step === 4 && !certificate) {
      toast.error('Advanced applicants must attach their Basic certificate.');
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
    const emailError = emailProblem(form.email, { requireGmail: true });
    if (emailError) {
      toast.error(emailError, { title: 'Check your email address' });
      return;
    }
    if (regHint) {
      toast.error(regHint, { title: 'Check your registration number' });
      return;
    }
    if (isAdvanced && !certificate) {
      toast.error('Advanced applicants must attach their Basic certificate.');
      return;
    }
    setSending(true);
    try {
      const payload = {
        intakeId: selected._id,
        name: form.name,
        email: normalizeEmail(form.email),
        phone: form.phone,
        campus: form.campus,
        regNumber: form.regNumber,
        levelOfStudy: form.levelOfStudy,
        department: form.department,
        gender: form.gender,
        motivation: form.motivation,
        program: form.preferred.join(', '),
        preferredCourses: form.preferred,
      };

      let body;
      let headers;
      if (certificate) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => fd.append(key, v));
          } else {
            fd.append(key, value);
          }
        });
        fd.append('certificate', certificate);
        body = fd;
      } else {
        body = JSON.stringify(payload);
        headers = { 'Content-Type': 'application/json' };
      }

      const result = await apiFetch('/applications', { method: 'POST', body, headers });
      // The 2,000 RWF early-payment notice comes back with the response, so the
      // card quotes the same amount the confirmation email does.
      const notice = result?.earlyPayment || EARLY_PAYMENT_NOTICE;
      setSubmitted({
        intakeTitle: selected.title,
        name: form.name.trim(),
        email: normalizeEmail(form.email),
        earlyPayment: notice,
      });
      toast.success('Application submitted!', { title: 'Check your email for your PIN 🎉', duration: 6000, grand: true });
      setForm((f) => ({
        name: isLoggedIn ? user.name : '',
        email: isLoggedIn ? user.email : '',
        phone: '',
        campus: '',
        regNumber: '',
        levelOfStudy: '',
        department: '',
        gender: '',
        preferred: [],
        motivation: '',
      }));
      setCertificate(null);
      setCertError('');
      setSelected(null);
      setStep(1);
    } catch (err) {
      toast.error(err.message || 'Failed to submit application.');
    } finally {
      setSending(false);
    }
  };

  // Short wording for the confirmation dialog, with the full sentences as the
  // fallback so a response from an older server (or a failed one) still reads.
  const short = {
    detail: submitted?.earlyPayment?.shortDetail || submitted?.earlyPayment?.detail || EARLY_PAYMENT_NOTICE_COMPACT.detail,
    certificateFeeExample:
      submitted?.earlyPayment?.shortExample ||
      submitted?.earlyPayment?.certificateFeeExample ||
      EARLY_PAYMENT_NOTICE_COMPACT.certificateFeeExample,
    action: submitted?.earlyPayment?.shortAction || submitted?.earlyPayment?.action || EARLY_PAYMENT_NOTICE_COMPACT.action,
  };

  return (
    <div className="apply-page">
      <section className="page-header">
        <div className="container">
          <h1>Apply for an Intake</h1>
          <p>Choose an open intake and submit your application in minutes</p>
        </div>
      </section>

      <section className="section">
        <div className="container apply-anchor" ref={anchorRef}>
          {loading && <div className="loading"><div className="spinner" />Loading intakes...</div>}

          {!loading && intakes.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>
                No open intakes at the moment. Check back soon or contact us for more information.
              </p>
              <Link to="/contact" className="btn btn-primary">Contact Us</Link>
            </div>
          )}

          {linkNotice && (
            <div className="alert alert-info intake-link-notice">
              <Info size={18} />
              <span>{linkNotice}</span>
              <Link to="/apply" className="btn btn-outline btn-xs">All intakes</Link>
            </div>
          )}

          {/* Confirmation is a modal, not an inline card: the applicant has
              just spent several steps on this form and must not have to scroll
              to discover whether it worked, or miss the PIN instructions. */}
          {submitted && (
            <div
              className="apply-done-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="apply-done-title"
              onClick={() => { setSubmitted(null); setLinkNotice(''); }}
            >
              <div className="apply-done" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="apply-done-close"
                  aria-label="Close"
                  onClick={() => { setSubmitted(null); setLinkNotice(''); }}
                >
                  <XCircle size={19} />
                </button>

                <div className="apply-done-head">
                  <span className="apply-done-tick"><CheckCircle size={18} /></span>
                  <h3 id="apply-done-title">Application received</h3>
                  <p>
                    Thank you{submitted.name ? `, ${submitted.name}` : ''}.{' '}
                    <b>{submitted.intakeTitle}</b> is with the DTS office.
                  </p>
                </div>

                <ul className="apply-done-steps">
                  <li>
                    <Mail size={15} />
                    <span>
                      Your <b>Registration Number</b> and <b>PIN</b> are on the way to{' '}
                      <b>{submitted.email}</b>. Sign in with them on your profile.
                    </span>
                  </li>
                  <li className="is-payment">
                    <Smartphone size={15} />
                    <span className="apply-done-pay">
                      <span>
                        Pay <b>{submitted.earlyPayment.amount?.toLocaleString('en-US')} {submitted.earlyPayment.currency}</b>{' '}
                        now to secure your place.
                      </span>
                      <em className="apply-done-plain">{short.detail}</em>
                      {short.certificateFeeExample && (
                        <em className="apply-done-example">{short.certificateFeeExample}</em>
                      )}
                      <span className="apply-done-how">
                        <CreditCard size={13} />
                        <span>{short.action}</span>
                      </span>
                    </span>
                  </li>
                </ul>

                <div className="apply-done-actions">
                  <Link to="/profile" className="btn btn-primary btn-sm">
                    Go to my student profile
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => { setSubmitted(null); setLinkNotice(''); }}
                  >
                    Apply for another intake
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="intake-grid">
            {!selected && !submitted && intakes.map((intake) => {
              const deadlinePassed = isDeadlinePassed(intake);
              const full = isFull(intake);
              const open = canApply(intake);
              const pct = Math.min(100, Math.round(((intake.enrolled || 0) / (intake.capacity || 1)) * 100));
              const seatsLeft = Math.max(0, (intake.capacity || 0) - (intake.enrolled || 0));
              const tone = String(intake.program || '').toLowerCase().includes('basic') ? 'basic' : 'advanced';
              const splitIdx = (intake.title || '').indexOf('·');
              const levelName = splitIdx >= 0 ? intake.title.slice(0, splitIdx).trim() : (intake.program || intake.title);
              const intakePeriod = splitIdx >= 0 ? intake.title.slice(splitIdx + 1).trim() : '';
              const statusText = full ? 'Full' : deadlinePassed ? 'Closed' : intake.status === 'open' ? 'Open' : 'Closed';
              return (
                <FadeIn key={intake._id}>
                  <div className={`card intake-card intake-tone-${tone} ${open ? 'is-open' : 'intake-closed'}`}>
                    <div className="intake-card-head">
                      <div className="intake-head-main">
                        <span className="intake-level">
                          <span className="intake-level-icon"><GraduationCap size={15} /></span>
                          <span className="intake-level-name">{levelName}</span>
                        </span>
                        {intakePeriod && <span className="intake-period">{intakePeriod}</span>}
                      </div>
                        <span className={`intake-status ${open ? '' : 'danger'}`}>
                          <span className="intake-status-dot" />
                          {statusText}
                        </span>
                        <button
                          type="button"
                          className="intake-share"
                          onClick={(e) => shareIntake(intake, e)}
                          aria-label={`Share application link for ${intake.title}`}
                          title="Share this application link"
                        >
                          <Share2 size={15} />
                          <span className="intake-share-text">Share</span>
                        </button>
                      </div>
                    <div className="intake-card-body">
                      {intake.description && <p className="intake-desc">{intake.description}</p>}
                      {Array.isArray(intake.courses) && intake.courses.length > 0 && (
                        <div className="intake-courses">
                          <span className="intake-courses-label">Curriculum</span>
                          <ul className="intake-course-list">
                            {intake.courses.map((c) => (
                              <li key={c} className="intake-course-item">
                                <CheckCircle2 size={14} />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="intake-meta">
                        {intake.startDate && (
                          <span className="intake-meta-item">
                            <Calendar size={15} />
                            <span><small>Starts</small><b>{fmtDate(intake.startDate)}</b></span>
                          </span>
                        )}
                        {intake.deadline && (
                          <span className="intake-meta-item">
                            <Clock size={15} />
                            <span><small>Deadline</small><b>{fmtDate(intake.deadline)}</b></span>
                          </span>
                        )}
                      </div>
                      <div className="intake-progress">
                        <div className="intake-progress-head">
                          <span className="intake-progress-label">Enrolled</span>
                          <span className="intake-progress-pct">{pct}%</span>
                        </div>
                        <div className="intake-bar">
                          <div className="intake-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="intake-progress-foot">
                          <span>{intake.enrolled || 0} of {intake.capacity || '—'} seats</span>
                          <span>{seatsLeft} left</span>
                        </div>
                      </div>
                      {open ? (
                        <button className="btn intake-btn" onClick={() => openForm(intake)}>
                          Apply Now <ArrowRight size={15} />
                        </button>
                      ) : (
                        <button className="btn intake-btn" disabled>
                          <XCircle size={15} /> {full ? 'Capacity Full' : 'Applications Closed'}
                        </button>
                      )}
                    </div>
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
                    <div className="apply-form-tools">
                      <button type="button" className="btn btn-outline btn-xs" onClick={(e) => shareIntake(selected, e)}>
                        <Share2 size={13} /> Share this link
                      </button>
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => { setSelected(null); setStep(1); setLinkNotice(''); }}>
                        <ArrowLeft size={13} /> Change level
                      </button>
                    </div>
                  </div>
                  {!isLoggedIn && (
                    <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      Applying as a guest. After you submit, you will receive your Registration Number and PIN by email to view your profile.
                    </div>
                  )}
                  {isAdvanced && (
                    <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <FileCheck2 size={18} />
                      <span>Advanced entrants must hold the DTS Basic certificate. You will be asked to upload it before you can submit.</span>
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
                            <input
                              name="email"
                              type="email"
                              className={`form-control${emailHint ? ' is-invalid' : ''}`}
                              value={form.email}
                              onChange={handleChange}
                              placeholder="you@example.com"
                              aria-invalid={Boolean(emailHint)}
                              aria-describedby="apply-email-hint"
                              required
                            />
                            {emailHint && (
                              <small id="apply-email-hint" className="form-error-hint">{emailHint}</small>
                            )}
                          </div>
                          <div className="form-group">
                            <label>Reg Number</label>
                            <input
                              name="regNumber"
                              className={`form-control${regHint ? ' is-invalid' : ''}`}
                              value={form.regNumber}
                              onChange={handleChange}
                              placeholder="22xxxxxxx"
                              autoComplete="off"
                              aria-invalid={Boolean(regHint)}
                              aria-describedby={regHint ? 'apply-reg-hint' : 'apply-reg-help'}
                            />
                            {regHint ? (
                              <small id="apply-reg-hint" className="form-error-hint">{regHint}</small>
                            ) : (
                              <small id="apply-reg-help" className="form-hint">Optional. Only if you have studied with DTS before.</small>
                            )}
                          </div>
                          <div className="form-group">
                            <label>Gender</label>
                            <select name="gender" className="form-control" value={form.gender} onChange={handleChange}>
                              <option value="">Prefer not to say</option>
                              {GENDERS.filter((g) => g !== 'Prefer not to say').map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="step-body">
                        <p className="step-hint">How can we reach you, and where are you coming from?</p>
                        <div className="grid-2">
                          <div className="form-group">
                            <label>Phone Number</label>
                            <input name="phone" className="form-control" value={form.phone} onChange={handleChange} placeholder="+250 7xx xxx xxx" />
                          </div>
                          <div className="form-group">
                            <label>Campus / Location</label>
                            <input name="campus" className="form-control" value={form.campus} onChange={handleChange} placeholder="e.g. Huye District" />
                            <small className="form-hint">Where you are coming from. Optional.</small>
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="step-body">
                        <p className="step-hint">Tell us where you are in your studies and what you want to take.</p>
                        <div className="grid-2">
                          <div className="form-group">
                            <label>Level of Study</label>
                            <select name="levelOfStudy" className="form-control" value={form.levelOfStudy} onChange={handleChange}>
                              <option value="">Select your level</option>
                              {LEVELS_OF_STUDY.map((level) => (
                                <option key={level} value={level}>{level}</option>
                              ))}
                            </select>
                          </div>
                           <div className="form-group">
                             <label>Department</label>
                             <input name="department" className="form-control" value={form.department} onChange={handleChange} placeholder="e.g. Education, Computer Science, Business & Management" />
                           </div>
                        </div>
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
                          <label>What do you want to be able to do after this training? (optional)</label>
                          <textarea
                            name="motivation"
                            className="form-control"
                            rows={3}
                            value={form.motivation}
                            onChange={handleChange}
                            placeholder="After this training I want to be able to... "
                          />
                          <small className="form-hint">
                            A sentence or two is plenty. Naming the specific thing you want to do — a job, a
                            business, a skill you have always wanted — helps us place you on the right course.
                          </small>
                        </div>
                      </div>
                    )}

                    {isAdvanced && step === 4 && (
                      <div className="step-body">
                        <p className="step-hint">
                          The {selected.program} session is open to applicants who already hold the DTS Basic
                          certificate. Upload yours so we can confirm your eligibility.
                        </p>
                        {certificate ? (
                          <div className="cert-picked">
                            <span className="cert-picked-icon"><FileCheck2 size={18} /></span>
                            <div className="cert-picked-text">
                              <strong>{certificate.name}</strong>
                              <small>{fmtBytes(certificate.size)} · Ready to upload</small>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => { setCertificate(null); setCertError(''); }}
                            >
                              <Trash2 size={13} /> Remove
                            </button>
                          </div>
                        ) : (
                          <label
                            className={`cert-drop${certError ? ' is-invalid' : ''}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); acceptCertificate(e.dataTransfer.files?.[0]); }}
                          >
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                              onChange={(e) => { acceptCertificate(e.target.files?.[0]); e.target.value = ''; }}
                              aria-describedby="apply-cert-help"
                            />
                            <UploadCloud size={28} />
                            <strong>Click to upload or drop your certificate here</strong>
                            <small id="apply-cert-help">JPG, PNG or PDF · up to {CERT_MAX_MB} MB</small>
                          </label>
                        )}
                        {certError && <small className="form-error-hint">{certError}</small>}
                      </div>
                    )}

                    {step === STEPS.length && (
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
                          <div className="apply-review-row"><span>Level of Study</span><strong>{form.levelOfStudy || '—'}</strong></div>
                          <div className="apply-review-row"><span>Department</span><strong>{form.department || '—'}</strong></div>
                          <div className="apply-review-row"><span>Gender</span><strong>{form.gender || 'Prefer not to say'}</strong></div>
                          <div className="apply-review-row">
                            <span>UR Reg Number</span>
                            <strong>{form.regNumber.trim() || '—'}</strong>
                          </div>
                          {isAdvanced && (
                            <div className="apply-review-row">
                              <span>Basic Certificate</span>
                              <strong>{certificate ? certificate.name : '—'}</strong>
                            </div>
                          )}
                          {form.motivation && <div className="apply-review-row"><span>Goals</span><strong>{form.motivation}</strong></div>}
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
    </div>
  );
}