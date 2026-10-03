import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers,
  Plus,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';
import ActionMenu from '../components/ActionMenu';

const emptyForm = { trainerId: '', intakeIds: [], course: '' };

const matches = (assignment, search) =>
  [
    assignment.trainerId?.name,
    assignment.trainerId?.email,
    assignment.intakeId?.title,
    assignment.intakeId?.program,
    assignment.course,
  ]
    .filter(Boolean)
    .some((value) => value.toString().toLowerCase().includes(search));

export default function TrainerAssignments() {
  const toast = useToast();
  const [trainers, setTrainers] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    try {
      const [trainerData, intakeData, assignmentData] = await Promise.all([
        apiFetch('/trainers'),
        apiFetch('/intakes/all'),
        apiFetch('/trainers/assignments'),
      ]);
      setTrainers(Array.isArray(trainerData) ? trainerData : []);
      setIntakes(Array.isArray(intakeData) ? intakeData : []);
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load trainer assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleIntake = (id) =>
    setForm((current) => ({
      ...current,
      intakeIds: current.intakeIds.includes(id)
        ? current.intakeIds.filter((value) => value !== id)
        : [...current.intakeIds, id],
    }));

  // The intake list changes with the intake the trainer actually teaches, so
  // only a course that belongs to every selected intake can be chosen.
  const courseOptions = useMemo(() => {
    if (form.intakeIds.length === 0) return [];
    const selected = intakes.filter((intake) => form.intakeIds.includes(intake._id));
    const shared = selected
      .map((intake) => (Array.isArray(intake.courses) ? intake.courses : []))
      .filter((courses) => courses.length);
    if (shared.length !== selected.length) return [];
    const common = shared[0].filter((course) => shared.every((courses) => courses.includes(course)));
    return Array.from(new Set(common));
  }, [form.intakeIds, intakes]);

  const create = async (event) => {
    event.preventDefault();
    if (!form.trainerId) {
      toast.error('Select the trainer who will teach these intakes.');
      return;
    }
    if (form.intakeIds.length === 0) {
      toast.error('Select at least one intake for this trainer.');
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch('/trainers/assignments', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const count = result?.count || form.intakeIds.length;
      toast.success(
        count === 1
          ? 'Trainer assigned to 1 intake.'
          : `Trainer assigned to ${count} intakes.`,
      );
      setForm(emptyForm);
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to create assignment.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await apiFetch(`/trainers/assignments/${id}`, { method: 'DELETE' });
      toast.success('Assignment ended.', { celebrate: false });
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to remove assignment.');
    }
  };

  // Rows left behind by an account or intake that has since been deleted. They
  // grant no access, so they are dead weight in the list rather than a warning,
  // but an admin should not have to wonder what they are.
  const cleanOrphans = async () => {
    setCleaning(true);
    try {
      const result = await apiFetch('/trainers/assignments/orphans', { method: 'DELETE' });
      const removed = result?.removed || 0;
      toast.success(
        removed === 1 ? 'Removed 1 broken assignment.' : `Removed ${removed} broken assignments.`,
        { celebrate: false },
      );
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to clean up.');
    } finally {
      setCleaning(false);
    }
  };

  const prefill = (trainerId) => {
    setForm({ trainerId, intakeIds: [], course: '' });
    document.getElementById('assignment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading assignments...</div>;

  const search = query.trim().toLowerCase();
  const visibleAssignments = search
    ? assignments.filter((assignment) => matches(assignment, search))
    : assignments;
  const activeCount = assignments.filter((assignment) => assignment.active).length;

  const isOrphan = (assignment) => !assignment.trainerId?.name || !assignment.intakeId?.title;
  const orphanCount = assignments.filter(isOrphan).length;

  // A trainer with an assignment row is assigned, whether or not the account
  // behind that row still resolves - the alternative is telling an admin to
  // "Assign" someone who is already assigned.
  const unassigned = trainers.filter(
    (trainer) => !assignments.some((assignment) => String(assignment.trainerId?._id || assignment.trainerId) === String(trainer._id)),
  );

  // Grouped by trainer rather than listed as flat rows. "Who teaches what" is
  // the question this screen answers, and one card per trainer with its intakes
  // inside answers it at a glance - the same data as one row per pairing spread
  // the answer across repeated trainer names.
  const groups = [];
  const byTrainer = new Map();
  visibleAssignments.forEach((assignment) => {
    const key = String(assignment.trainerId?._id || assignment.trainerId || 'orphaned');
    if (!byTrainer.has(key)) {
      const group = {
        key,
        name: assignment.trainerId?.name || null,
        email: assignment.trainerId?.email || null,
        disabled: assignment.trainerId?.active === false,
        items: [],
      };
      byTrainer.set(key, group);
      groups.push(group);
    }
    byTrainer.get(key).items.push(assignment);
  });
  groups.forEach((group) => {
    group.active = group.items.filter((item) => item.active && !isOrphan(item)).length;
    group.ended = group.items.filter((item) => !item.active || isOrphan(item)).length;
  });
  // Trainers with no rows at all still need a card, or an admin cannot tell
  // "unassigned" apart from "not loaded yet".
  unassigned.forEach((trainer) => {
    if (byTrainer.has(String(trainer._id))) return;
    groups.push({
      key: String(trainer._id),
      name: trainer.name,
      email: trainer.email,
      disabled: trainer.active === false,
      items: [],
      active: 0,
      ended: 0,
    });
  });

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>Trainer Assignments</h2>
          <p>Give each trainer access to the students of the intakes they teach.</p>
        </div>
        <ClipboardCheck size={24} className="workspace-header-icon" />
      </div>

      {trainers.length === 0 && (
        <div className="alert alert-warning" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Users size={17} />
          <p>
            No trainer accounts exist yet. Create one with the <b>Trainer</b> role on{' '}
            <Link to="/admin/users">User Access</Link> first — only trainer accounts can be assigned.
          </p>
        </div>
      )}

      {orphanCount > 0 && (
        <div className="alert alert-warning assign-cleanup" style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <AlertTriangle size={17} />
          <p style={{ flex: '1 1 18rem' }}>
            <b>{orphanCount} assignment{orphanCount === 1 ? '' : 's'} point at a deleted trainer or intake.</b>{' '}
            They grant no access and are kept only as history. Clear them to tidy this list.
          </p>
          <button type="button" className="btn btn-outline btn-xs" onClick={cleanOrphans} disabled={cleaning}>
            {cleaning ? 'Cleaning...' : 'Clear broken rows'}
          </button>
        </div>
      )}

      <form id="assignment-form" className="dash-panel assignment-form" onSubmit={create}>
        <div className="dash-panel-head">
          <h3><Plus size={17} /> New assignment</h3>
          {trainers.length > 0 && (
            <span className="dash-pill">
              {activeCount} active · {trainers.length} trainer{trainers.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="student-form-grid">
          <div className="form-group">
            <label htmlFor="assign-trainer">Trainer</label>
            <select
              id="assign-trainer"
              className="form-control"
              value={form.trainerId}
              onChange={(e) => update('trainerId', e.target.value)}
              required
            >
              <option value="">Select trainer</option>
              {trainers.map((trainer) => (
                <option key={trainer._id} value={trainer._id}>
                  {trainer.name} · {trainer.email}{trainer.active === false ? ' (disabled)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="assign-course">
              Course <small className="label-hint">(optional — blank covers the whole intake)</small>
            </label>
            <input
              id="assign-course"
              className="form-control"
              list="assignment-course-options"
              value={form.course}
              onChange={(e) => update('course', e.target.value)}
              placeholder={courseOptions.length ? 'Whole intake, or pick one course' : 'Whole intake'}
            />
            <datalist id="assignment-course-options">
              {courseOptions.map((course) => (
                <option key={course} value={course} />
              ))}
            </datalist>
            {form.intakeIds.length > 1 && courseOptions.length === 0 && (
              <small className="form-hint">
                These intakes do not share a course list, so this covers each whole intake.
              </small>
            )}
          </div>

          <div className="form-group assign-intakes">
            <label>
              <Layers size={13} /> Intakes / levels taught
              {form.intakeIds.length > 0 && (
                <small className="label-hint"> — {form.intakeIds.length} selected</small>
              )}
            </label>
            {intakes.length === 0 ? (
              <p className="form-hint">No intakes have been created yet.</p>
            ) : (
              <div className="course-options assign-intake-options">
                {intakes.map((intake) => (
                  <label
                    key={intake._id}
                    className={`course-option ${form.intakeIds.includes(intake._id) ? 'is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.intakeIds.includes(intake._id)}
                      onChange={() => toggleIntake(intake._id)}
                    />
                    <span className="course-checkbox" aria-hidden="true" />
                    <span>
                      <strong>{intake.title}</strong>
                      <small>{intake.program}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="assign-form-foot">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving
              ? 'Saving...'
              : form.intakeIds.length > 1
                ? `Assign to ${form.intakeIds.length} intakes`
                : 'Create assignment'}
          </button>
          {form.trainerId && (
            <small className="form-hint">
              {form.intakeIds.length === 0
                ? 'Now pick the intakes this trainer teaches.'
                : `Adds access for ${trainers.find((t) => t._id === form.trainerId)?.name || 'this trainer'}.`}
            </small>
          )}
        </div>
      </form>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h3>
            Who teaches what
            {assignments.length > 0 && (
              <span className="dash-pill">
                {activeCount} active · {assignments.length - activeCount} ended
              </span>
            )}
          </h3>
          <input
            className="form-control assignment-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trainer, intake or course"
            aria-label="Search assignments"
          />
        </div>

        {groups.length === 0 ? (
          <p className="table-empty">
            {assignments.length === 0 ? 'No assignments yet.' : 'No assignments match that search.'}
          </p>
        ) : (
          <div className="assign-grid">
            {groups.map((group) => (
              <section
                key={group.key}
                className={`assign-card ${group.active === 0 ? 'is-empty' : ''} ${group.name ? '' : 'is-orphan'}`}
              >
                <header className="assign-card-head">
                  <span className="assign-avatar" aria-hidden="true">
                    {group.name ? group.name.charAt(0).toUpperCase() : '?'}
                  </span>
                  <div className="assign-card-id">
                    <strong>{group.name || 'Deleted trainer'}</strong>
                    {group.email && <small>{group.email}</small>}
                    {!group.name && <small className="assign-card-flag">Account no longer exists</small>}
                    {group.disabled && group.name && (
                      <small className="assign-card-flag">Account disabled</small>
                    )}
                  </div>
                  {group.items.length === 0 ? (
                    <span className="assign-tag is-none">
                      <UserCheck size={12} /> Not assigned
                    </span>
                  ) : (
                    <span className="assign-tag">
                      <CheckCircle2 size={12} /> {group.active} active
                    </span>
                  )}
                </header>

                {group.items.length > 0 && (
                  <ul className="assign-card-list">
                    {group.items.map((assignment) => {
                      const orphan = isOrphan(assignment);
                      const label = assignment.course || 'All courses';
                      return (
                        <li key={assignment._id} className={assignment.active && !orphan ? '' : 'is-ended'}>
                          <span className="assign-intake-icon" aria-hidden="true">
                            <GraduationCap size={15} />
                          </span>
                          <div className="assign-card-body">
                            <strong>
                              {assignment.intakeId?.title || 'Deleted intake'}
                            </strong>
                            <small>
                              {orphan ? 'Intake no longer exists' : label}
                              {assignment.intakeId?.program && !orphan ? ` · ${assignment.intakeId.program}` : ''}
                            </small>
                          </div>
                          <div className="assign-card-end">
                            <span
                              className={`assign-tag is-${assignment.active && !orphan ? 'on' : 'off'}`}
                            >
                              {assignment.active && !orphan ? 'Active' : orphan ? 'Broken' : 'Ended'}
                            </span>
                            <ActionMenu
                              label={`Actions for ${group.name || 'this trainer'}`}
                              items={[
                                {
                                  label: 'End this assignment',
                                  tone: 'danger',
                                  icon: <Trash2 size={14} />,
                                  disabled: !assignment.active,
                                  onSelect: () => remove(assignment._id),
                                },
                              ]}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {group.items.length === 0 && (
                  <p className="assign-card-empty">
                    No intake yet.{' '}
                    <button type="button" className="assign-link" onClick={() => prefill(group.key)}>
                      Assign {group.name ? group.name.split(' ')[0] : 'this trainer'}
                    </button>
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <p className="settings-footnote">
        <BookOpen size={13} /> Ending an assignment removes access only. Attendance and marks already
        recorded are kept.
      </p>
    </div>
  );
}
