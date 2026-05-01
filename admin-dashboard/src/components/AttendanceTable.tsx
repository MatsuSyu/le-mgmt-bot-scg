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
      <h3>Attendance Details</h3>
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Status</th>
            <th>Updated At</th>
            <th>Car Info</th>
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
              <td>{record.updated_at?.toDate().toLocaleString() || 'N/A'}</td>
              <td>{record.car_info ? `🚗 ${record.car_info.count || 1} seats` : '-'}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: '#a0a0a5' }}>
                No records found. Waiting for submissions...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
