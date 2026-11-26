import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, CalendarCheck, CalendarDays, ClipboardCheck, GraduationCap,
  Percent, TrendingUp, TriangleAlert, Users, Award, Clock,
} from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';

const cards = [
  { key: 'studentCount', label: 'Students', icon: <Users size={17} />, tone: 'sky' },
  { key: 'assignmentCount', label: 'Assignments', icon: <GraduationCap size={17} />, tone: 'violet' },
  { key: 'attendanceRate', label: 'Attendance %', icon: <Percent size={17} />, tone: 'green', suffix: '%', meter: true },
  { key: 'sessionCount', label: 'Sessions', icon: <CalendarDays size={17} />, tone: 'amber' },
  { key: 'marksRecorded', label: 'Marks entered', icon: <ClipboardCheck size={17} />, tone: 'blue' },
];

const STATUS_TONE = {
  present: { label: 'Present', className: 'is-present' },
  late: { label: 'Late', className: 'is-late' },
  absent: { label: 'Absent', className: 'is-absent' },
  excused: { label: 'Excused', className: 'is-excused' },
};

const dayLabel = (value) =>
  new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

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

  // Only the last handful of points, so a long term does not squash the chart
  // into a single unreadable column.
  const trend = useMemo(() => (data?.trend || []).slice(-10), [data]);

  if (loading) return <div className="loading"><div className="spinner" />Loading trainer workspace...</div>;
  if (!data) return <div className="alert alert-error">Trainer data is unavailable.</div>;

  const atRisk = data.atRisk || [];
  const ungraded = data.studentsWithoutMarks || 0;
  const hasClasses = (data.assignmentCount || 0) > 0;
  const updatedAt = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>Your classes</h2>
          <p>Register, marks, and students at risk.</p>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 11 }}>Updated {updatedAt}</p>
        </div>
        <div className="workspace-intro-actions">
          <Link to="/trainer/students" className="btn btn-outline"><Users size={14} /> Students</Link>
          <Link to="/trainer/marks" className="btn btn-outline"><ClipboardCheck size={14} /> Marks</Link>
          <Link to="/trainer/attendance" className="btn btn-primary">Attendance <ArrowUpRight size={14} /></Link>
        </div>
      </div>

      {!hasClasses ? (
        <div className="alert alert-info">
          You have no active assignments yet. An administrator has to give you an intake on{' '}
          <Link to="/admin/trainer-assignments">Trainer Assignments</Link> first.
        </div>
      ) : (
        <>
          {/* Work that is outstanding, kept apart from the standing totals so a
              trainer can tell what needs doing from what is simply a number. */}
          {(atRisk.length > 0 || ungraded > 0) ? (
            <section className="dash-section">
              <div className="dash-section-head">
                <h2 className="is-attention"><TriangleAlert size={14} /> Needs attention</h2>
                <p>
                  {ungraded > 0 ? `${ungraded} no marks` : null}
                  {ungraded > 0 && atRisk.length > 0 ? ' · ' : null}
                  {atRisk.length > 0 ? `${atRisk.length} < 75% attendance` : null}
                </p>
              </div>
              <div className="dash-row">
                {atRisk.length > 0 && (
                  <div className="dash-panel">
                    <div className="dash-panel-head">
                      <h3>Lowest attendance</h3>
                      <Link to="/trainer/attendance" className="dash-panel-link">Register <ArrowUpRight size={12} /></Link>
                    </div>
                    <div className="at-risk-list">
                      {atRisk.map((entry) => (
                        <div key={entry.id} className="at-risk-row">
                          <div className="at-risk-name">
                            <strong>{entry.name}</strong>
                            <small>{entry.regNumber}</small>
                          </div>
                          <div className="at-risk-meter" aria-hidden="true">
                            <i style={{ width: `${entry.rate}%` }} />
                          </div>
                          <span className="at-risk-rate">{entry.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="dash-panel">
                  <div className="dash-panel-head">
                    <h3>Marks coverage</h3>
                    <Link to="/trainer/marks" className="dash-panel-link">Marks <ArrowUpRight size={12} /></Link>
                  </div>
                  <div className="readiness-list">
                    <div><span>No marks</span><strong className={ungraded > 0 ? 'is-warn' : 'is-ok'}>{ungraded}</strong></div>
                    <div><span>Entered</span><strong>{data.marksRecorded || 0}</strong></div>
                    <div><span>Sessions</span><strong>{data.sessionCount || 0}</strong></div>
                  </div>
                  {ungraded > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Link to="/trainer/students" className="dash-panel-link">Students <ArrowUpRight size={12} /></Link>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <div className="dash-clear">
              <ClipboardCheck size={17} />
              <p><b>All clear.</b> Every student has marks and nobody is below 75% attendance.</p>
            </div>
          )}

          <section className="dash-section">
            <div className="dash-section-head">
              <h2>Overview</h2>
              <p>Assigned intakes</p>
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
                      <div className={`stat-meter stat-meter-${card.tone}`} title={`${value}% attendance rate`}>
                        <i style={{ width: `${Math.min(100, Math.max(0, Number(value) || 0))}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="dash-row">
            <div className="dash-panel">
              <div className="dash-panel-head">
                <h3><TrendingUp size={16} /> Attendance trend</h3>
                <span className="dash-pill">{trend.length > 0 ? `last ${trend.length} session${trend.length === 1 ? '' : 's'}` : 'No data'}</span>
              </div>
              {trend.length === 0 ? (
                <div className="dash-empty">
                  <CalendarCheck size={24} />
                  <p>No sessions yet.</p>
                  <Link to="/trainer/attendance" className="btn btn-outline" style={{ marginTop: 6, padding: '0.32rem 0.55rem', fontSize: '0.8rem' }}>Record</Link>
                </div>
              ) : (
                <div className="trend">
                  {trend.map((point) => (
                    <div key={point.date} className="trend-col" title={`${dayLabel(point.date)}: ${point.rate}% of ${point.marked} marked`}>
                      <div className="trend-bar-wrap">
                        <div
                          className={`trend-bar${point.rate >= 75 ? ' is-ok' : point.rate >= 50 ? ' is-mid' : ' is-low'}`}
                          style={{ height: `${Math.max(4, point.rate)}%` }}
                        />
                      </div>
                      <span className="trend-value">{point.rate}%</span>
                      <span className="trend-label">{dayLabel(point.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dash-panel">
              <div className="dash-panel-head">
                <h3><Clock size={16} /> Recent sessions</h3>
              </div>
              {(data.recentAttendance || []).length === 0 ? (
                <div className="dash-empty">
                  <CalendarDays size={24} />
                  <p>No records yet.</p>
                  <Link to="/trainer/attendance" className="btn btn-outline" style={{ marginTop: 6, padding: '0.32rem 0.55rem', fontSize: '0.8rem' }}>Attendance</Link>
                </div>
              ) : (
                <div className="dash-list">
                  {data.recentAttendance.map((record) => {
                    const tone = STATUS_TONE[record.status] || STATUS_TONE.absent;
                    return (
                      <div key={record._id} className="dash-list-item">
                        <div className="dash-list-meta">
                          <p>{record.student?.name || 'Student'}</p>
                          <small>
                            {dayLabel(record.sessionDate)}{record.course ? ` · ${record.course}` : ''}
                          </small>
                        </div>
                        <span className={`recent-status ${tone.className}`}>{tone.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
