import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

export default function TrainerAssignments() {
  const toast = useToast();
  const [trainers, setTrainers] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ trainerId: '', intakeId: '', course: '' });
  const [loading, setLoading] = useState(true);

  const load = () => Promise.all([apiFetch('/trainers'), apiFetch('/intakes/all'), apiFetch('/trainers/assignments')]).then(([trainerData, intakeData, assignmentData]) => { setTrainers(Array.isArray(trainerData) ? trainerData : []); setIntakes(Array.isArray(intakeData) ? intakeData : []); setAssignments(Array.isArray(assignmentData) ? assignmentData : []); }).catch((error) => toast.error(error.message || 'Failed to load trainer assignments.')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const create = async (event) => {
    event.preventDefault();
    try { await apiFetch('/trainers/assignments', { method: 'POST', body: JSON.stringify(form) }); toast.success('Trainer assignment created.'); setForm({ trainerId: '', intakeId: '', course: '' }); await load(); } catch (error) { toast.error(error.message || 'Failed to create assignment.'); }
  };
  const remove = async (id) => {
    try { await apiFetch(`/trainers/assignments/${id}`, { method: 'DELETE' }); toast.success('Assignment removed.'); await load(); } catch (error) { toast.error(error.message || 'Failed to remove assignment.'); }
  };
  if (loading) return <div className="loading"><div className="spinner" />Loading assignments...</div>;
  const selectedIntake = intakes.find((intake) => intake._id === form.intakeId);
  return <div className="workspace-page"><div className="workspace-intro"><div><h2>Trainer Assignments</h2><p>Give each trainer access only to the students they teach.</p></div><ClipboardCheck size={24} className="workspace-header-icon" /></div><form className="dash-panel assignment-form" onSubmit={create}><div className="dash-panel-head"><h3><Plus size={17} /> New assignment</h3></div><div className="student-form-grid"><div className="form-group"><label>Trainer</label><select className="form-control" value={form.trainerId} onChange={(e) => update('trainerId', e.target.value)} required><option value="">Select trainer</option>{trainers.map((trainer) => <option key={trainer._id || trainer.id} value={trainer._id || trainer.id}>{trainer.name} · {trainer.email}</option>)}</select></div><div className="form-group"><label>Intake / level</label><select className="form-control" value={form.intakeId} onChange={(e) => update('intakeId', e.target.value)} required><option value="">Select intake</option>{intakes.map((intake) => <option key={intake._id} value={intake._id}>{intake.title}</option>)}</select></div><div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Course (optional)</label><input className="form-control" list="assignment-course-options" value={form.course} onChange={(e) => update('course', e.target.value)} placeholder="Leave blank for the whole intake" /><datalist id="assignment-course-options">{(selectedIntake?.courses || []).map((course) => <option key={course} value={course} />)}</datalist></div></div><button className="btn btn-primary" type="submit">Create assignment</button></form><div className="table-scroll"><table className="admin-table"><thead><tr><th>Trainer</th><th>Intake / level</th><th>Course</th><th>Status</th><th>Action</th></tr></thead><tbody>{assignments.length === 0 && <tr><td colSpan={5} className="table-empty">No assignments yet.</td></tr>}{assignments.map((assignment) => { const trainer = assignment.trainerId || {}; const intake = assignment.intakeId || {}; return <tr key={assignment._id}><td><strong>{trainer.name || 'Unknown trainer'}</strong><small className="table-subtext">{trainer.email}</small></td><td>{intake.title || 'Intake'}<small className="table-subtext">{intake.program}</small></td><td>{assignment.course || 'Whole intake'}</td><td><span className={`finance-status ${assignment.active ? 'status-paid' : 'status-neutral'}`}>{assignment.active ? 'Active' : 'Inactive'}</span></td><td>{assignment.active && <button className="btn btn-danger btn-xs" onClick={() => remove(assignment._id)}><Trash2 size={13} /> Remove</button>}</td></tr>; })}</tbody></table></div></div>;
}
