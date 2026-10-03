import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Save, Trash2, ChevronRight } from 'lucide-react';
import apiFetch from '../api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

// One letter per status, so a whole register can be read at a glance the way a
// paper one is. The cycle order is deliberate: Present first, because it is what
// almost every cell is, so a trainer marking a full class only ever clicks once.
const STATUSES = [
  { value: 'present', letter: 'P', label: 'Present' },
  { value: 'absent', letter: 'A', label: 'Absent' },
  { value: 'late', letter: 'L', label: 'Late' },
  { value: 'excused', letter: 'E', label: 'Excused' },
];
const LETTER = Object.fromEntries(STATUSES.map((s) => [s.value, s.letter]));
const LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const longDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

// The next status in the cycle, wrapping back to Present. Clicking the cell a
// second time from Present steps to Absent, which is the only adjustment a
// trainer makes mid-register.
const nextStatus = (value) => {
  const index = STATUSES.findIndex((s) => s.value === value);
  return STATUSES[(index + 1) % STATUSES.length].value;
};

export default function TrainerAttendance() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState(searchParams.get('assignmentId') || '');
  const [intakeId, setIntakeId] = useState(searchParams.get('intakeId') || '');
  const [course, setCourse] = useState(searchParams.get('course') || '');
  const [sessionDate, setSessionDate] = useState(today());
  const [students, setStudents] = useState([]);
  // The register: studentId -> dateKey -> { status, notes }
  const [grid, setGrid] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    apiFetch('/trainer/assignments')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAssignments(list);
        if (!assignmentId && list.length) {
          const first = list[0];
          setAssignmentId(first._id);
          setIntakeId(first.intakeId?._id || first.intakeId);
          setCourse(first.course || '');
        }
      })
      .catch((error) => toast.error(error.message || 'Failed to load assignments.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The whole class's attendance at once, not one day at a time: the register
  // has to show every session side by side, which is the entire point of
  // putting the dates in columns.
  useEffect(() => {
    if (!intakeId) {
      setStudents([]);
      setGrid({});
      return;
    }
    const params = new URLSearchParams({ intakeId });
    if (course) params.set('course', course);
    Promise.all([
      apiFetch(`/trainer/students?${params.toString()}`),
      apiFetch(`/trainer/attendance?${params.toString()}`),
    ])
      .then(([studentData, attendanceData]) => {
        const list = Array.isArray(studentData) ? studentData : [];
        const records = Array.isArray(attendanceData) ? attendanceData : [];
        const next = {};
        list.forEach((student) => {
          next[student._id] = {};
        });
        records.forEach((record) => {
          const id = String(record.studentId?._id || record.studentId);
          const key = String(record.sessionDate).slice(0, 10);
          if (!next[id]) return;
          next[id][key] = { status: record.status, notes: record.notes || '' };
        });
        setStudents(list);
        setGrid(next);
      })
      .catch((error) => toast.error(error.message || 'Failed to load the register.'));
  }, [intakeId, course, toast]);

  const selectedAssignment = useMemo(
    () => assignments.find((item) => item._id === assignmentId),
    [assignments, assignmentId],
  );

  // Every session date on record, oldest first, so the register reads left to
  // right in the order the term happened.
  const dates = useMemo(() => {
    const keys = new Set();
    Object.values(grid).forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
    return [...keys].sort();
  }, [grid]);

  const selectAssignment = (value) => {
    const assignment = assignments.find((item) => item._id === value);
    if (!assignment) return;
    setAssignmentId(value);
    setIntakeId(assignment.intakeId?._id || assignment.intakeId);
    setCourse(assignment.course || '');
  };

  const cycle = (studentId, dateKey) =>
    setGrid((current) => {
      const row = current[studentId] || {};
      const cell = row[dateKey] || { status: 'present', notes: '' };
      return {
        ...current,
        [studentId]: { ...row, [dateKey]: { ...cell, status: nextStatus(cell.status) } },
      };
    });

  const setNote = (studentId, dateKey, notes) =>
    setGrid((current) => {
      const row = current[studentId] || {};
      const cell = row[dateKey] || { status: 'present', notes: '' };
      return { ...current, [studentId]: { ...row, [dateKey]: { ...cell, notes } } };
    });

  const dayCounts = (dateKey) => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0, marked: 0 };
    students.forEach((student) => {
      const cell = grid[student._id]?.[dateKey];
      if (!cell) return;
      counts.marked += 1;
      if (counts[cell.status] !== undefined) counts[cell.status] += 1;
    });
    return counts;
  };

  const isSaved = (dateKey) => dayCounts(dateKey).marked > 0;
  const activeCounts = dayCounts(sessionDate);

  const saveDay = async () => {
    if (!intakeId || !students.length) return;
    setSaving(true);
    try {
      const entries = students.map((student) => {
        const cell = grid[student._id]?.[sessionDate] || { status: 'present', notes: '' };
        return { studentId: student._id, status: cell.status, notes: cell.notes };
      });
      await apiFetch('/trainer/attendance', {
        method: 'POST',
        body: JSON.stringify({ intakeId, sessionDate, course, entries }),
      });
      // The saved copy is authoritative, so re-read rather than trusting local
      // state that may have been edited again while the request was in flight.
      const params = new URLSearchParams({ intakeId, sessionDate });
      if (course) params.set('course', course);
      const records = await apiFetch(`/trainer/attendance?${params.toString()}`);
      setGrid((current) => {
        const next = { ...current };
        students.forEach((student) => {
          const record = (Array.isArray(records) ? records : []).find(
            (item) => String(item.studentId?._id || item.studentId) === student._id,
          );
          next[student._id] = {
            ...(next[student._id] || {}),
            [sessionDate]: { status: record?.status || 'present', notes: record?.notes || '' },
          };
        });
        return next;
      });
      toast.success(`Attendance saved for ${longDate(sessionDate)}.`);
    } catch (error) {
      toast.error(error.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const clearDay = async () => {
    try {
      const result = await apiFetch('/trainer/attendance', {
        method: 'DELETE',
        body: JSON.stringify({ intakeId, sessionDate, course }),
      });
      setGrid((current) => {
        const next = { ...current };
        students.forEach((student) => {
          const row = { ...(next[student._id] || {}) };
          delete row[sessionDate];
          next[student._id] = row;
        });
        return next;
      });
      setConfirmClear(false);
      toast.success(result?.message || 'Session cleared.', { celebrate: false });
    } catch (error) {
      toast.error(error.message || 'Failed to clear the session.');
    }
  };

  const markAll = (status) => {
    setGrid((current) => {
      const next = { ...current };
      students.forEach((student) => {
        const row = { ...(next[student._id] || {}) };
        const cell = row[sessionDate] || { notes: '' };
        row[sessionDate] = { ...cell, status };
        next[student._id] = row;
      });
      return next;
    });
  };

  // The whole register as a spreadsheet: one row per student, one column per
  // session date, plus the notes the trainer typed for each.
  const downloadRegister = () => {
    if (!students.length) return;
    const columns = dates.includes(sessionDate) ? dates : [...dates, sessionDate].sort();
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['Registration', 'Name', ...columns.map((d) => `${d}${isSaved(d) ? '' : ' (unsaved)'}`), 'Notes'];
    const rows = students.map((student) => [
      student.regNumber,
      student.name,
      ...columns.map((d) => {
        const cell = grid[student._id]?.[d];
        return cell ? LETTER[cell.status] || '' : '';
      }),
      columns.map((d) => grid[student._id]?.[d]?.notes || '').filter(Boolean).join(' | '),
    ]);
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const label = (selectedAssignment?.intakeId?.title || 'class').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    link.download = `attendance-${label}${course ? `-${course}` : ''}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Register downloaded.', { celebrate: false });
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading register...</div>;

  const hasActiveColumn = dates.includes(sessionDate);

  return (
    <div className="workspace-page">
      <div className="workspace-intro">
        <div>
          <h2>Attendance</h2>
          <p>Click a cell to change a student&rsquo;s status.</p>
        </div>
        <div className="workspace-intro-actions">
          <button type="button" className="btn btn-outline" onClick={downloadRegister} disabled={!students.length}>
            <Download size={15} /> Download
          </button>
          <button type="button" className="btn btn-primary" onClick={saveDay} disabled={saving || !students.length}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save day'}
          </button>
        </div>
      </div>

      <div className="attendance-toolbar">
        <div className="attendance-toolbar-group">
          <label className="form-label">Class</label>
          <select className="form-control" value={assignmentId} onChange={(e) => selectAssignment(e.target.value)} aria-label="Class">
            <option value="">Choose a class</option>
            {assignments.map((assignment) => {
              const intake = assignment.intakeId || {};
              return <option key={assignment._id} value={assignment._id}>{intake.title || 'Intake'}{assignment.course ? ` · ${assignment.course}` : ''}</option>;
            })}
          </select>
        </div>
        <div className="attendance-toolbar-group">
          <label className="form-label">Session date</label>
          <input className="form-control" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} aria-label="Session date" />
        </div>
        <div className="attendance-tally">
          {STATUSES.map((status) => (
            <span key={status.value} className={`attendance-tally-chip is-${status.value}`} title={LABEL[status.value]}>
              <b>{activeCounts[status.value]}</b>
              <small>{LETTER[status.value]}</small>
            </span>
          ))}
          <span className="attendance-tally-chip is-total" title="Marked / Total students">
            <b>{activeCounts.marked}</b>/{students.length}
          </span>
        </div>
        <div className="attendance-bulk">
          <button type="button" className="btn btn-outline btn-xs" onClick={() => markAll('present')}>All present</button>
          <button type="button" className="btn btn-outline btn-xs" onClick={() => markAll('absent')}>All absent</button>
          <button type="button" className="btn btn-outline btn-xs" onClick={() => markAll('late')}>All late</button>
          <button type="button" className="btn btn-outline btn-xs" onClick={() => markAll('excused')}>All excused</button>
          {isSaved(sessionDate) && (
            <button type="button" className="btn btn-danger btn-xs" onClick={() => setConfirmClear(true)}>
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {!students.length ? (
        <div className="alert alert-info">Choose a class with students to begin.</div>
      ) : (
        <>
          <div className="register-wrap">
            <table className="register-grid">
              <thead>
                <tr>
                  <th className="register-corner" scope="col">Student</th>
                  {dates.map((date) => (
                    <th
                      key={date}
                      scope="col"
                      className={date === sessionDate ? 'is-active' : undefined}
                    >
                      <button type="button" onClick={() => setSessionDate(date)} title={longDate(date)}>
                        {shortDate(date)}
                        {isSaved(date) ? null : <i className="register-unsaved-dot" title="Not saved" />}
                      </button>
                    </th>
                  ))}
                  {/* The day being edited is always the last column so the
                      trainer's eye does not have to travel back and forth. */}
                  {hasActiveColumn ? null : (
                    <th scope="col" className="is-active is-new">
                      <button type="button" onClick={() => setSessionDate(sessionDate)}>
                        {shortDate(sessionDate)}<ChevronRight size={11} />
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <th scope="row" className="register-student">
                       <strong className="student-name">{student.name}</strong>
                       <small className="student-reg">{student.regNumber}</small>
                    </th>
                    {dates.map((date) => {
                      const cell = grid[student._id]?.[date];
                      const status = cell?.status;
                      return (
                        <td key={date}>
                          <button
                            type="button"
                            className={`register-cell is-${status || 'empty'}${date === sessionDate ? ' is-active' : ''}`}
                            onClick={() => {
                              if (date !== sessionDate) setSessionDate(date);
                              else cycle(student._id, date);
                            }}
                            title={status ? `${student.name} — ${LABEL[status]}${cell.notes ? ` · ${cell.notes}` : ''}` : `${student.name} — not recorded`}
                            aria-label={`${student.name}, ${shortDate(date)}, ${status ? LABEL[status] : 'not recorded'}`}
                          >
                            {status ? LETTER[status] : '·'}
                          </button>
                        </td>
                      );
                    })}
                    {hasActiveColumn ? null : (
                      <td>
                        <button
                          type="button"
                          className={`register-cell is-active ${(grid[student._id]?.[sessionDate]?.status || 'present')}`}
                          onClick={() => cycle(student._id, sessionDate)}
                          title={`${student.name} — ${LABEL[grid[student._id]?.[sessionDate]?.status || 'present']}`}
                        >
                          {LETTER[grid[student._id]?.[sessionDate]?.status || 'present']}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="register-legend">
            {STATUSES.map((status) => (
              <span key={status.value}><i className={`register-swatch is-${status.value}`} />{status.label}</span>
            ))}
          </div>

          {/* Notes for the day being worked on, kept out of the grid so the
              grid stays a scannable P/A/L/E matrix. */}
          <div className="attendance-notes">
            <h3>Notes for {longDate(sessionDate)}</h3>
            {students.map((student) => {
              const cell = grid[student._id]?.[sessionDate];
              if (!cell) return null;
              return (
                <div key={student._id} className="attendance-note-row">
                  <div className="attendance-note-student">
                    <strong>{student.name}</strong>
                    <small>{student.regNumber}</small>
                  </div>
                  <input
                    className="form-control"
                    value={cell.notes || ''}
                    onChange={(e) => setNote(student._id, sessionDate, e.target.value)}
                    placeholder="Optional note"
                    aria-label={`Note for ${student.name}`}
                  />
                </div>
              );
            })}
            {!students.some((student) => grid[student._id]?.[sessionDate]) ? (
              <p className="form-hint">Mark a cell above to add a note.</p>
            ) : null}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear this session?"
        message={`This removes every attendance record saved for ${longDate(sessionDate)}. The day can be recorded again afterwards.`}
        confirmLabel="Clear session"
        onConfirm={clearDay}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
