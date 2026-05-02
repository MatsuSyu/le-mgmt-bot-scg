import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc, Timestamp } from 'firebase/firestore';
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ date: '', type: '練習', location: '', target: 'regular' });

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

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.date || !newSchedule.location) return;
    try {
      const dateObj = new Date(newSchedule.date);
      const scheduleId = `${newSchedule.date.replace(/-/g, '')}_${newSchedule.type === '練習' ? 'practice' : 'game'}`;
      await setDoc(doc(db, "schedules", scheduleId), {
        date: Timestamp.fromDate(dateObj),
        type: newSchedule.type,
        location: newSchedule.location,
        target_categories: [newSchedule.target],
        created_at: new Date()
      });
      setNewSchedule({ date: '', type: '練習', location: '', target: 'regular' });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding schedule:", error);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>📅 予定管理</h3>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '閉じる' : '+ 予定追加'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSchedule} style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>日付</label>
              <input 
                type="date" 
                value={newSchedule.date} 
                onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>種別</label>
              <select 
                value={newSchedule.type} 
                onChange={(e) => setNewSchedule({...newSchedule, type: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="練習">練習</option>
                <option value="試合">試合</option>
                <option value="体験会">体験会</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>場所</label>
              <input 
                type="text" 
                value={newSchedule.location} 
                onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                placeholder="例：A小学校"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>対象</label>
              <select 
                value={newSchedule.target} 
                onChange={(e) => setNewSchedule({...newSchedule, target: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="regular">レギュラー</option>
                <option value="junior">ジュニア</option>
                <option value="u5">5年以下</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">登録</button>
          </div>
        </form>
      )}

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
