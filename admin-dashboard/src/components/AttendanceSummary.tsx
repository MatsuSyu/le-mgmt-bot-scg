import React from 'react';

interface SummaryProps {
  present: number;
  absent: number;
  total: number;
  carpoolShortage: number;
}

const AttendanceSummary: React.FC<SummaryProps> = ({ present, absent, total, carpoolShortage }) => {
  return (
    <>
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

      {carpoolShortage > 0 && (
        <div className="card" style={{ marginBottom: '2rem', border: '2px solid #e63946', background: 'rgba(230, 57, 70, 0.1)' }}>
          <h3 style={{ color: '#e63946', marginBottom: '0.5rem' }}>⚠️ 配車不足アラート</h3>
          <p>現在、座席が <strong>{carpoolShortage}席</strong> 不足しています。Geminiが募集文案を作成しました。</p>
          <button className="badge badge-danger" style={{ marginTop: '1rem', cursor: 'pointer', border: 'none' }}>
            募集文をLINEに送る
          </button>
        </div>
      )}
    </>
  );
};

export default AttendanceSummary;
