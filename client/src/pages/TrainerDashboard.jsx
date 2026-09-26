import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ClipboardCheck, GraduationCap, Users, Percent } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

const cards = [
  { key: 'studentCount', label: 'Assigned Students', icon: <Users size={17} />, tone: 'sky' },
  { key: 'assignmentCount', label: 'Active Assignments', icon: <GraduationCap size={17} />, tone: 'violet' },
  { key: 'attendanceRate', label: 'Attendance Rate', icon: <Percent size={17} />, tone: 'green', suffix: '%', meter: true },
  { key: 'marksRecorded', label: 'Marks Recorded', icon: <ClipboardCheck size={17} />, tone: 'amber' },
];

export default function TrainerDashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/trainer/dashboard')
      .then(setData)
      .catch((error) => toast.error(error.message || 'Failed to load trainer dashboard.'))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <div className="loading"><div className="spinner" />Loading trainer workspace...</div>;
  if (!data) return <div className="alert alert-error">Trainer data is unavailable.</div>;

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>Welcome to your trainer workspace</h2>
          <p>Record attendance, update student marks, and monitor your assigned classes.</p>
        </div>
        <Link to="/trainer/attendance" className="btn btn-primary">Take attendance <ArrowUpRight size={15} /></Link>
      </div>
      <div className="admin-dash-grid">
        {cards.map((card) => {
          const value = data[card.key] ?? 0;
          return (
            <div key={card.key} className={`stat-card tone-${card.tone}`}>
              <div className="stat-top">
                <div className="stat-value">{value}{card.suffix || ''}</div>
                <div className="stat-chip">{card.icon}</div>
              </div>
              <div className="stat-label">{card.label}</div>
              {card.meter && (
                <div className="stat-meter" title={`${value}% attendance rate`}>
                  <i style={{ width: `${Math.min(100, Math.max(0, Number(value) || 0))}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="dash-row">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>Class readiness</h3>
            <Link to="/trainer/students" className="dash-panel-link">View roster <ArrowUpRight size={14} /></Link>
          </div>
          <div className="readiness-list">
            <div><span>Students without marks</span><strong>{data.studentsWithoutMarks || 0}</strong></div>
            <div><span>Attendance sessions recorded</span><strong>{data.sessionCount || 0}</strong></div>
            <div><span>Students assigned</span><strong>{data.studentCount || 0}</strong></div>
          </div>
        </div>
        <div className="dash-panel quick-panel">
          <div className="dash-panel-head"><h3>Quick actions</h3></div>
          <div className="dash-actions">
            <Link to="/trainer/attendance" className="dash-action"><ClipboardCheck size={16} /> Record attendance <ArrowUpRight size={14} /></Link>
            <Link to="/trainer/marks" className="dash-action"><GraduationCap size={16} /> Enter marks <ArrowUpRight size={14} /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
