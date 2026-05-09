import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface GroundReservation {
  id: string;
  date: string;
  stadium_name: string;
  time_slot: string;
  status: 'reserved' | 'applying' | 'available';
  notes?: string;
  created_at: any;
}

const GroundManager: React.FC = () => {
  const [reservations, setReservations] = useState<GroundReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRes, setNewRes] = useState({
    date: '',
    stadium_name: '',
    time_slot: '',
    status: 'reserved' as const,
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, "stadium_reservations"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: GroundReservation[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as GroundReservation);
      });
      setReservations(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRes.date || !newRes.stadium_name) {
      alert("日付と球場名は必須です！");
      return;
    }
    try {
      const id = `res_${Date.now()}`;
      await setDoc(doc(db, "stadium_reservations", id), {
        ...newRes,
        created_at: new Date()
      });
      setNewRes({ date: '', stadium_name: '', time_slot: '', status: 'reserved', notes: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この確保情報を削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "stadium_reservations", id));
    } catch (err) {
      alert("削除に失敗しました");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reserved': return <span className="badge badge-success">確保済</span>;
      case 'applying': return <span className="badge badge-warning">申請中</span>;
      case 'available': return <span className="badge badge-primary">空きあり</span>;
      default: return null;
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>🏟️ 球場確保情報</h3>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '閉じる' : '+ 確保情報を追加'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>日付*</label>
              <input type="date" value={newRes.date} onChange={e => setNewRes({...newRes, date: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>球場名*</label>
              <input type="text" value={newRes.stadium_name} onChange={e => setNewRes({...newRes, stadium_name: e.target.value})} placeholder="例：遊水地A" style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>時間枠</label>
              <input type="text" value={newRes.time_slot} onChange={e => setNewRes({...newRes, time_slot: e.target.value})} placeholder="例：9:00-13:00" style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>状態</label>
              <select value={newRes.status} onChange={e => setNewRes({...newRes, status: e.target.value as any})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                <option value="reserved">確保済</option>
                <option value="applying">申請中</option>
                <option value="available">空きあり</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>備考</label>
              <input type="text" value={newRes.notes} onChange={e => setNewRes({...newRes, notes: e.target.value})} placeholder="特記事項など" style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary">保存する</button>
            </div>
          </div>
        </form>
      )}

      {loading ? <p>読み込み中...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>球場名</th>
                <th>時間枠</th>
                <th>状態</th>
                <th>備考</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>登録情報がありません</td></tr>
              ) : (
                reservations.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.date}</td>
                    <td>{r.stadium_name}</td>
                    <td>{r.time_slot || '-'}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td style={{ fontSize: '0.85rem' }}>{r.notes || '-'}</td>
                    <td>
                      <button onClick={() => handleDelete(r.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px' }}>削除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GroundManager;
