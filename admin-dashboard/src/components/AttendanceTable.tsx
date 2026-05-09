import React from 'react';

interface AttendanceRecord {
  id: string;
  user_id: string;
  schedule_id: string;
  status: string;
  updated_at: any;
  car_info?: any;
}

interface TableProps {
  records: AttendanceRecord[];
  members: any[];
  schedules: any[];
}

const AttendanceTable: React.FC<TableProps> = ({ records, members, schedules }) => {
  const getMemberName = (id: string) => {
    const m = members.find(m => m.id === id);
    return m ? m.short_name || m.name : id;
  };

  const getScheduleInfo = (id: string) => {
    const s = schedules.find(s => s.id === id);
    if (!s) return '不明';
    const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
    return `${d.getMonth() + 1}/${d.getDate()} ＠${s.location}`;
  };

  // Sort records by updated_at desc
  const sortedRecords = [...records].sort((a, b) => {
    const ta = a.updated_at?.toDate ? a.updated_at.toDate().getTime() : 0;
    const tb = b.updated_at?.toDate ? b.updated_at.toDate().getTime() : 0;
    return tb - ta;
  });

  return (
    <div className="card table-container">
      <h3>出欠状況の回答ログ（最新）</h3>
      <table>
        <thead>
          <tr>
            <th>予定対象</th>
            <th>名前</th>
            <th>ステータス</th>
            <th>配車</th>
            <th>更新日時</th>
          </tr>
        </thead>
        <tbody>
          {sortedRecords.length > 0 ? sortedRecords.map(record => (
            <tr key={record.id}>
              <td style={{ fontSize: '0.8rem' }}>{getScheduleInfo(record.schedule_id)}</td>
              <td style={{ fontWeight: 600 }}>{getMemberName(record.user_id)}</td>
              <td>
                <span className={`badge ${record.status === '出席' ? 'badge-success' : record.status === '欠席' ? 'badge-danger' : 'badge-warning'}`}>
                   {record.status}
                </span>
              </td>
              <td style={{ fontSize: '0.8rem' }}>{record.car_info ? `🚗${record.car_info.mode}` : '-'}</td>
              <td style={{ fontSize: '0.75rem', color: '#666' }}>{record.updated_at?.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || '不明'}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#a0a0a5' }}>
                データが見つかりません。回答を待っています...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
