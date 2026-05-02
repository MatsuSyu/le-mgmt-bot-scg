import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

interface Car {
  id: string;
  owner_name: string;
  max_seats: number;
  is_available: boolean;
}

const CarManager: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "cars"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Car[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Car);
      });
      setCars(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>🚗 車両管理</h3>
        <p style={{ color: '#8d99ae', fontSize: '0.85rem' }}>配車計算に使用される車両マスターデータです</p>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>所有者</th>
              <th>最大定員 (運転手含)</th>
              <th>通常時提供可能</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {cars.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>登録された車両はありません</td></tr>
            ) : (
              cars.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.owner_name}</td>
                  <td>{c.max_seats} 名</td>
                  <td>
                    <span className={`badge ${c.is_available ? 'badge-success' : 'badge-danger'}`}>
                      {c.is_available ? '可能' : '不可'}
                    </span>
                  </td>
                  <td><button style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>修正</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CarManager;
