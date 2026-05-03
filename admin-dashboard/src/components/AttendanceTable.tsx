import React from 'react';

interface AttendanceRecord {
  id: string;
  user_id: string;
  status: string;
  updated_at: any;
  car_info?: any;
}

interface TableProps {
  records: AttendanceRecord[];
}

const AttendanceTable: React.FC<TableProps> = ({ records }) => {
  return (
    <div className="card table-container">
      <h3>出欠状況（最新）</h3>
      <table>
        <thead>
          <tr>
            <th>ユーザーID</th>
            <th>ステータス</th>
            <th>更新日時</th>
            <th>配車状況</th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? records.map(record => (
            <tr key={record.id}>
              <td>{record.user_id}</td>
              <td>
                <span className={`badge ${record.status === '出席' ? 'badge-success' : 'badge-danger'}`}>
                   {record.status}
                </span>
              </td>
              <td>{record.updated_at?.toDate().toLocaleString('ja-JP') || '不明'}</td>
              <td>{record.car_info ? `🚗 ${record.car_info.mode}` : '-'}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: '#a0a0a5' }}>
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
