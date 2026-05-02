import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Schedule {
  id: string;
  date: any;
  type: string;
  location: string;
  target_categories: string[];
  description?: string;
}

const ScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "schedules"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Schedule[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Schedule);
      });
      setSchedules(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>📅 予定管理</h3>
        <button className="btn-primary">+ 予定追加</button>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>種別</th>
              <th>場所</th>
              <th>対象</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>登録された予定はありません</td></tr>
            ) : (
              schedules.map((s) => (
                <tr key={s.id}>
                  <td>{s.date?.toDate().toLocaleDateString('ja-JP')}</td>
                  <td>
                    <span className="badge badge-primary">{s.type}</span>
                  </td>
                  <td>{s.location}</td>
                  <td>{s.target_categories?.join(', ') || '全カテゴリ'}</td>
                  <td><button style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>編集</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ScheduleManager;
