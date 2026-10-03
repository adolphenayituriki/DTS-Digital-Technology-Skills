import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Plus, Trash2, Users, BookOpen } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';
import ActionMenu from '../components/ActionMenu';

const emptyForm = { trainerId: '', intakeIds: [], course: '' };

// One row per assignment, in a single table. This was a card per trainer with a
// nested table, which meant a separate header block and a nested scroll region
// for every trainer on the page; a flat list scans faster and sorts, and it is
// the same shape as the other admin tables.
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
      toast.success('Assignment removed.', { celebrate: false });
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to remove assignment.');
    }
  };

  const prefill = (trainerId) => setForm({ trainerId, intakeIds: [], course: '' });

  if (loading) return <div className="loading"><div className="spinner" />Loading assignments...</div>;

  const search = query.trim().toLowerCase();
  const visibleAssignments = search
    ? assignments.filter((assignment) => matches(assignment, search))
    : assignments;
  const activeCount = assignments.filter((assignment) => assignment.active).length;

  // A trainer with an assignment row is assigned, whether or not the account
  // behind that row still resolves - the alternative is telling an admin to
  // "Assign" someone who is already assigned.
  const unassigned = trainers.filter(
    (trainer) => !assignments.some((assignment) => String(assignment.trainerId?._id || assignment.trainerId) === String(trainer._id)),
  );

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

      {trainers.length > 0 && unassigned.length > 0 && (
        <div className="alert alert-info" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Users size={17} />
          <p style={{ flex: '1 1 16rem' }}>
            <b>Not assigned yet:</b> {unassigned.map((t) => t.name).join(', ')}
          </p>
          {unassigned.map((trainer) => (
            <button
              key={trainer._id}
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => prefill(trainer._id)}
            >
              Assign {trainer.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <form className="dash-panel assignment-form" onSubmit={create}>
        <div className="dash-panel-head">
          <h3><Plus size={17} /> New assignment</h3>
        </div>
        <div className="student-form-grid">
          <div className="form-group">
            <label>Trainer</label>
            <select
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

          <div className="form-group" style={{ gridColumn: form.intakeIds.length ? '1 / -1' : undefined }}>
            <label>Intakes / levels taught</label>
            {intakes.length === 0 ? (
              <p className="form-hint">No intakes have been created yet.</p>
            ) : (
              <div className="course-options">
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
                    <span>{intake.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Course <small className="label-hint">(optional — blank covers the whole intake)</small></label>
            <input
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
                These intakes do not share a course list, so this assignment covers each whole intake.
              </small>
            )}
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving
            ? 'Saving...'
            : form.intakeIds.length > 1
              ? `Assign to ${form.intakeIds.length} intakes`
              : 'Create assignment'}
        </button>
      </form>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h3>
            Assignments
            {assignments.length > 0 && (
              <span className="dash-pill">{activeCount} active · {assignments.length} total</span>
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

        <div className="admin-table-scroll">
          <table className="admin-table compact-table assignment-table">
            <thead>
              <tr>
                <th>Trainer</th>
                <th>Intake / level</th>
                <th>Course</th>
                <th>Status</th>
                <th className="col-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visibleAssignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-empty">
                    {assignments.length === 0 ? 'No assignments yet.' : 'No assignments match that search.'}
                  </td>
                </tr>
              )}
              {visibleAssignments.map((assignment) => {
                // Populate leaves these null when the referenced account or
                // intake is gone, so the row is labelled rather than left blank.
                const trainerName = assignment.trainerId?.name;
                const intakeTitle = assignment.intakeId?.title;
                return (
                  <tr key={assignment._id} className={assignment.active ? undefined : 'is-disabled'}>
                    <td>
                      <strong>{trainerName || 'Deleted trainer'}</strong>
                      {assignment.trainerId?.email && (
                        <small className="table-subtext">{assignment.trainerId.email}</small>
                      )}
                    </td>
                    <td>
                      <strong>{intakeTitle || 'Deleted intake'}</strong>
                      {assignment.intakeId?.program && (
                        <small className="table-subtext">{assignment.intakeId.program}</small>
                      )}
                    </td>
                    <td>{assignment.course || <span className="table-subtext">All courses</span>}</td>
                    <td>
                      <span className={`finance-status ${assignment.active ? 'status-paid' : 'status-neutral'}`}>
                        {assignment.active ? 'Active' : 'Ended'}
                      </span>
                    </td>
                    <td className="col-actions">
                      <ActionMenu
                        label={`Actions for ${trainerName || 'this trainer'}`}
                        items={[
                          {
                            label: 'End this assignment',
                            tone: 'danger',
                            icon: <Trash2 size={14} />,
                            onSelect: () => remove(assignment._id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="settings-footnote">
        <BookOpen size={13} /> Removing an assignment ends access only. Attendance and marks already
        recorded are kept.
      </p>
    </div>
  );
}
