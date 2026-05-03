import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface OperationLog {
  id: string;
  timestamp: any;
  action_type: string;
  message: string;
  user_id: string;
}

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: OperationLog[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as OperationLog);
      });
      setLogs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>ログを読み込み中...</div>;

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>📜 操作履歴・システムログ</h3>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #3d405b', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>日時</th>
              <th style={{ padding: '0.5rem' }}>種別</th>
              <th style={{ padding: '0.5rem' }}>内容</th>
              <th style={{ padding: '0.5rem' }}>ユーザー</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #3d405b' }}>
                <td style={{ padding: '0.5rem', color: '#8d99ae' }}>
                  {log.timestamp?.toDate().toLocaleString('ja-JP')}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <span className={`badge ${log.action_type === 'ERROR' ? 'badge-danger' : 'badge-primary'}`}>
                    {log.action_type === 'ERROR' ? 'エラー' : log.action_type === 'INFO' ? '情報' : log.action_type}
                  </span>
                </td>
                <td style={{ padding: '0.5rem' }}>{log.message}</td>
                <td style={{ padding: '0.5rem', color: '#8d99ae' }}>{log.user_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogViewer;
