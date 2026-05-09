import React, { useState } from 'react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [nameFilter, setNameFilter] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Range Filters
  const [updateStart, setUpdateStart] = useState('');
  const [updateEnd, setUpdateEnd] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  
  const pageSize = 20;

  const getMemberName = (id: string) => {
    const m = members.find(m => m.id === id);
    return m ? m.short_name || m.name : id;
  };

  const getScheduleDate = (id: string) => {
    const s = schedules.find(s => s.id === id);
    if (!s) return null;
    return s.date?.toDate ? s.date.toDate() : new Date(s.date);
  };

  const getScheduleInfo = (id: string) => {
    const d = getScheduleDate(id);
    if (!d) return '不明';
    const s = schedules.find(s => s.id === id);
    return `${d.getMonth() + 1}/${d.getDate()} ＠${s?.location || '不明'}`;
  };

  // Filter records
  const filteredRecords = records.filter(record => {
    // 1. Basic Filters
    const nameMatch = getMemberName(record.user_id).toLowerCase().includes(nameFilter.toLowerCase());
    const scheduleMatch = !scheduleFilter || record.schedule_id === scheduleFilter;
    const statusMatch = !statusFilter || record.status === statusFilter;
    
    // 2. Updated At Range
    let updateMatch = true;
    if (record.updated_at) {
        const d = record.updated_at.toDate ? record.updated_at.toDate() : new Date(record.updated_at);
        if (updateStart) {
            const start = new Date(updateStart);
            start.setHours(0, 0, 0, 0);
            if (d < start) updateMatch = false;
        }
        if (updateEnd) {
            const end = new Date(updateEnd);
            end.setHours(23, 59, 59, 999);
            if (d > end) updateMatch = false;
        }
    }

    // 3. Schedule Date Range
    let schedDateMatch = true;
    const sd = getScheduleDate(record.schedule_id);
    if (sd) {
        if (scheduleStart) {
            const start = new Date(scheduleStart);
            start.setHours(0, 0, 0, 0);
            if (sd < start) schedDateMatch = false;
        }
        if (scheduleEnd) {
            const end = new Date(scheduleEnd);
            end.setHours(23, 59, 59, 999);
            if (sd > end) schedDateMatch = false;
        }
    } else if (scheduleStart || scheduleEnd) {
        schedDateMatch = false;
    }

    return nameMatch && scheduleMatch && statusMatch && updateMatch && schedDateMatch;
  });

  // Sort filtered records by updated_at desc
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const ta = a.updated_at?.toDate ? a.updated_at.toDate().getTime() : (a.updated_at ? new Date(a.updated_at).getTime() : 0);
    const tb = b.updated_at?.toDate ? b.updated_at.toDate().getTime() : (b.updated_at ? new Date(b.updated_at).getTime() : 0);
    return tb - ta;
  });

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize);
  const pagedRecords = sortedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="card table-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>📋 出欠状況の回答ログ</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #eee', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>基本フィルタ</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.8rem' }}
              >
                <option value="">すべての状態</option>
                <option value="出席">出席</option>
                <option value="欠席">欠席</option>
              </select>
              <input 
                type="text" 
                placeholder="名前で検索..." 
                value={nameFilter} 
                onChange={(e) => { setNameFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>予定日の範囲</label>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <input type="date" value={scheduleStart} onChange={(e) => { setScheduleStart(e.target.value); setCurrentPage(1); }} style={{ padding: '0.2rem', fontSize: '0.75rem' }} />
              <span>~</span>
              <input type="date" value={scheduleEnd} onChange={(e) => { setScheduleEnd(e.target.value); setCurrentPage(1); }} style={{ padding: '0.2rem', fontSize: '0.75rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>回答日時の範囲</label>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <input type="date" value={updateStart} onChange={(e) => { setUpdateStart(e.target.value); setCurrentPage(1); }} style={{ padding: '0.2rem', fontSize: '0.75rem' }} />
              <span>~</span>
              <input type="date" value={updateEnd} onChange={(e) => { setUpdateEnd(e.target.value); setCurrentPage(1); }} style={{ padding: '0.2rem', fontSize: '0.75rem' }} />
            </div>
          </div>
          
          <button 
            className="btn-secondary" 
            onClick={() => {
              setNameFilter(''); setStatusFilter(''); setScheduleFilter('');
              setUpdateStart(''); setUpdateEnd(''); setScheduleStart(''); setScheduleEnd('');
              setCurrentPage(1);
            }}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', alignSelf: 'flex-end' }}
          >
            リセット
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="dense-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '150px' }}>予定対象</th>
              <th>名前</th>
              <th style={{ width: '80px' }}>回答</th>
              <th>配車・詳細</th>
              <th style={{ width: '120px' }}>更新日時</th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.length > 0 ? pagedRecords.map(record => (
              <tr key={record.id}>
                <td style={{ fontSize: '0.75rem' }}>{getScheduleInfo(record.schedule_id)}</td>
                <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{getMemberName(record.user_id)}</td>
                <td>
                  <span className={`badge ${record.status === '出席' ? 'badge-success' : record.status === '欠席' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                     {record.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.75rem' }}>
                  {record.car_info ? (
                    <span title={JSON.stringify(record.car_info)}>🚗 {record.car_info.mode}</span>
                  ) : '-'}
                </td>
                <td style={{ fontSize: '0.7rem', color: '#8d99ae' }}>
                  {record.updated_at?.toDate ? record.updated_at.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (record.updated_at ? new Date(record.updated_at).toLocaleString() : '---')}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#8d99ae' }}>
                  該当するデータがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
          <button 
            className="btn-secondary" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
          >
            前へ
          </button>
          <span style={{ fontSize: '0.8rem' }}>{currentPage} / {totalPages}</span>
          <button 
            className="btn-secondary" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
