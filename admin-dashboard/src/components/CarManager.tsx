import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, setDoc, doc } from 'firebase/firestore';
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCar, setNewCar] = useState({ owner_name: '', max_seats: 5, is_available: true });

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

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCar.owner_name) return;
    try {
      // Use owner name as ID for simplicity in this demo, usually would be user_id
      const carId = `car_${newCar.owner_name}`;
      await setDoc(doc(db, "cars", carId), {
        ...newCar,
        updated_at: new Date()
      });
      setNewCar({ owner_name: '', max_seats: 5, is_available: true });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding car:", error);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3>🚗 車両管理</h3>
          <p style={{ color: '#8d99ae', fontSize: '0.85rem' }}>配車計算に使用される車両マスターデータです</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '閉じる' : '+ 車両登録'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCar} style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>所有者名</label>
              <input 
                type="text" 
                value={newCar.owner_name} 
                onChange={(e) => setNewCar({...newCar, owner_name: e.target.value})}
                placeholder="例：山田"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>最大定員</label>
              <input 
                type="number" 
                value={newCar.max_seats} 
                onChange={(e) => setNewCar({...newCar, max_seats: parseInt(e.target.value)})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>提供可能</label>
              <select 
                value={newCar.is_available ? 'true' : 'false'} 
                onChange={(e) => setNewCar({...newCar, is_available: e.target.value === 'true'})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="true">可能</option>
                <option value="false">不可</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">保存</button>
          </div>
        </form>
      )}

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
