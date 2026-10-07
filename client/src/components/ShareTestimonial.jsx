import React, { useState } from 'react';
import { PenLine, Send, Star, CheckCircle2 } from 'lucide-react';
import Dialog from './Dialog';
import apiFetch from '../api';

const MAX_LENGTH = 800;

// The public way into the testimonials section: anyone can write one without an
// account, and it lands with isApproved false. The admin Testimonials page is
// where it gets approved or rejected, and GET /testimonials only returns
// approved rows - so the dialog tells people that up front. An unreviewed
// submission that does not appear immediately should read as the stated
// process, never as a broken form.
export default function ShareTestimonial() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', content: '', rating: 5 });
  const [sending, setSending] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const openDialog = () => {
    setForm({ name: '', role: '', content: '', rating: 5 });
    setFieldError('');
    setError('');
    setDone(false);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const content = form.content.trim();

    if (!name) {
      setFieldError('Please add the name you want shown.');
      return;
    }
    if (content.length < 15) {
      setFieldError('Please write at least 15 characters about your experience.');
      return;
    }

    setFieldError('');
    setError('');
    setSending(true);
    try {
      await apiFetch('/testimonials', {
        method: 'POST',
        anonymous: true,
        body: JSON.stringify({
          name,
          role: form.role.trim(),
          content,
          rating: form.rating,
        }),
      });
      setDone(true);
    } catch (err) {
      // apiFetch already turns a dead connection into an offline-aware
      // message, so this is what the visitor sees when the send fails.
      setError(err?.message || 'Could not send your testimonial. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="testimonial-share">
        <button type="button" className="btn btn-outline" onClick={openDialog}>
          <PenLine size={15} /> Share your experience
        </button>
        <span className="form-hint">
          Every submission is reviewed by our team before it appears here.
        </span>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Share your story"
        subtitle="Tell others what DTS helped you achieve. Your words go to our team first and appear on this page once approved."
        icon={<PenLine size={18} />}
        footer={
          done ? (
            <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </button>
              <button
                type="submit"
                form="testimonial-form"
                className="btn btn-primary"
                disabled={sending}
              >
                <Send size={15} /> {sending ? 'Sending...' : 'Send for review'}
              </button>
            </>
          )
        }
      >
        {done ? (
          <div className="testimonial-thanks" role="status">
            <CheckCircle2 size={34} aria-hidden="true" />
            <p>
              <b>Thank you, {form.name.trim()}!</b>
            </p>
            <p>
              Your testimonial is with our team. It will appear in this section once
              it has been approved.
            </p>
          </div>
        ) : (
          <form id="testimonial-form" onSubmit={submit} noValidate>
            <div className="form-group">
              <label htmlFor="testimonial-name">Your name *</label>
              <input
                id="testimonial-name"
                name="name"
                className="form-control"
                value={form.name}
                onChange={change}
                maxLength={80}
                placeholder="e.g. Jean-Pierre Habimana"
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="testimonial-role">How should we credit you?</label>
              <input
                id="testimonial-role"
                name="role"
                className="form-control"
                value={form.role}
                onChange={change}
                maxLength={80}
                placeholder="e.g. Computer Science Student"
              />
              <span className="form-hint">Optional - your course, class or community.</span>
            </div>

            <div className="form-group">
              <label htmlFor="testimonial-content">Your testimonial *</label>
              <textarea
                id="testimonial-content"
                name="content"
                className="form-control"
                rows={4}
                value={form.content}
                onChange={change}
                maxLength={MAX_LENGTH}
                placeholder="What did DTS help you learn or achieve?"
              />
              <span className="form-hint">
                {form.content.length}/{MAX_LENGTH} characters
              </span>
            </div>

            <div className="form-group">
              <label id="testimonial-rating-label">Your rating</label>
              <div className="tstar-row" role="group" aria-labelledby="testimonial-rating-label">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`tstar ${n <= form.rating ? 'on' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    aria-pressed={n <= form.rating}
                  >
                    <Star size={18} fill={n <= form.rating ? '#f59e0b' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {fieldError && <span className="form-error-hint">{fieldError}</span>}
            {error && <span className="form-error-hint">{error}</span>}
          </form>
        )}
      </Dialog>
    </>
  );
}
