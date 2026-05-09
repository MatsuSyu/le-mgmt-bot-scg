import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, where, Timestamp } from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface OperationLog {
  id: string;
  timestamp: any;
  action_type: string;
  message: string;
  user_id: string;
  user_input?: string;
  bot_response?: string;
  group_id?: string;
  source_type?: string;
}

interface LogViewerProps {
  members: any[];
}

const LogViewer: React.FC<LogViewerProps> = ({ members }) => {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const pageSize = 20;

  const fetchLogs = async (isMore = false) => {
    if (isMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const baseQuery = collection(db, "logs");
      let constraints: any[] = [orderBy("timestamp", "desc"), limit(pageSize)];
      
      if (dateFilter) {
        const start = new Date(dateFilter);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateFilter);
        end.setHours(23, 59, 59, 999);
        
        constraints.unshift(where("timestamp", ">=", Timestamp.fromDate(start)));
        constraints.unshift(where("timestamp", "<=", Timestamp.fromDate(end)));
      }

      let q;
      if (isMore && lastDoc) {
        q = query(baseQuery, ...constraints, startAfter(lastDoc));
      } else {
        q = query(baseQuery, ...constraints);
      }

      const snapshot = await getDocs(q);
      const data: OperationLog[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...(doc.data() as any) } as OperationLog);
      });

      if (isMore) {
        setLogs(prev => [...prev, ...data]);
      } else {
        setLogs(data);
      }

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastDoc(lastVisible || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      'MEMBER_UPDATE': '名簿更新',
      'SCHEDULE_UPDATE': '予定更新',
      'SYNC_SHEETS': 'Sheets同期',
      'BOT_CHAT': 'Bot対話',
      'BROADCAST': '一斉お知らせ'
    };
    return labels[action] || action;
  };

  useEffect(() => {
    fetchLogs();
  }, [dateFilter]);

  const getMemberName = (id: string) => {
    if (!id) return '不明';
    const m = members.find(m => m.line_user_id === id);
    return m ? m.short_name || m.name : id.substring(0, 8);
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3>📜 操作履歴・対話ログ</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem' }}>絞り込み:</label>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.8rem' }}
          />
          <button className="btn-secondary" onClick={() => fetchLogs()} disabled={loading} style={{ padding: '0.3rem 0.8rem' }}>更新</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="dense-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '120px' }}>日時</th>
              <th style={{ width: '110px' }}>種別 / 名前</th>
              <th>内容 / 対話詳細</th>
              <th style={{ width: '120px' }}>場所</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ verticalAlign: 'top' }}>
                <td style={{ fontSize: '0.7rem', color: '#8d99ae' }}>
                  {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}
                </td>
                <td style={{ padding: '0.5rem 0.2rem' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span className={`badge ${
                      log.action_type === 'ERROR' ? 'badge-danger' : 
                      log.action_type === 'BOT_CHAT' ? 'badge-success' : 
                      log.action_type === 'BROADCAST' ? 'badge-warning' : 'badge-primary'
                    }`} style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                      {getActionLabel(log.action_type)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getMemberName(log.user_id)}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.8rem' }}>{log.message}</div>
                  {log.user_input && (
                    <div style={{ background: '#f8f9fa', padding: '0.4rem', borderRadius: '4px', fontSize: '0.7rem', borderLeft: '3px solid #dee2e6' }}>
                      <div style={{ color: '#0369a1' }}>🗨️ {log.user_input}</div>
                      <div style={{ color: '#666', borderTop: '1px solid #eee', marginTop: '4px', paddingTop: '4px' }}>🤖 {log.bot_response}</div>
                    </div>
                  )}
                </td>
                <td style={{ fontSize: '0.7rem', color: '#8d99ae' }}>
                  {log.group_id ? (
                    <div title={log.group_id}>🏠 {log.group_id.substring(0, 6)}</div>
                  ) : (
                    <div>👤 Private</div>
                  )}
                  {log.source_type && <div style={{ fontSize: '0.6rem' }}>via {log.source_type}</div>}
                </td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#8d99ae' }}>ログはありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            className="btn-secondary" 
            onClick={() => fetchLogs(true)} 
            disabled={loadingMore}
            style={{ padding: '0.5rem 2rem' }}
          >
            {loadingMore ? '読み込み中...' : 'さらに読み込む'}
          </button>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
