import React from 'react';

interface SummaryProps {
  present: number;
  absent: number;
  total: number;
}

const AttendanceSummary: React.FC<SummaryProps> = ({ present, absent, total }) => {
  return (
    <div className="stats-grid">
      <div className="card stat-card">
        <div className="label">Total Members</div>
        <div className="value">{total}</div>
      </div>
      <div className="card stat-card">
        <div className="label">Present</div>
        <div className="value" style={{ color: '#4ade80' }}>{present}</div>
      </div>
      <div className="card stat-card">
        <div className="label">Absent</div>
        <div className="value" style={{ color: '#f87171' }}>{absent}</div>
      </div>
      <div className="card stat-card">
        <div className="label">Participation Rate</div>
        <div className="value">{total > 0 ? Math.round((present / total) * 100) : 0}%</div>
      </div>
    </div>
  );
};

export default AttendanceSummary;
