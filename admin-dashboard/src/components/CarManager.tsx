import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface Car {
  id: string;
  owner_name: string;
  max_seats: number;
  car_model?: string;
  car_color?: string;
  notes?: string;
  is_available: boolean;
}

const CarManager: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [newCar, setNewCar] = useState({ 
    owner_name: '', 
    max_seats: 5, 
    car_model: '', 
    car_color: '', 
    notes: '', 
    is_available: true 
  });

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

  const handleEditClick = (c: Car) => {
    setEditingCar(c);
    setNewCar({
      owner_name: c.owner_name,
      max_seats: c.max_seats,
      car_model: c.car_model || '',
      car_color: c.car_color || '',
      notes: c.notes || '',
      is_available: c.is_available ?? true
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingCar(null);
    setNewCar({ owner_name: '', max_seats: 5, car_model: '', car_color: '', notes: '', is_available: true });
    setShowAddForm(false);
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCar.owner_name) {
      alert("所有者名は必須入力です！");
      return;
    }
    try {
      const carId = editingCar?.id || `car_${newCar.owner_name}_${Date.now()}`;
      await setDoc(doc(db, "cars", carId), {
        ...newCar,
        updated_at: new Date()
      });
      handleCancelEdit();
    } catch (error) {
      console.error("Error adding/updating car:", error);
      alert("登録に失敗しました。");
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3>🚗 車両管理</h3>
          <p style={{ color: '#8d99ae', fontSize: '0.85rem' }}>配車計算に使用される車両マスターデータです</p>
        </div>
        <button className="btn-primary" onClick={() => showAddForm ? handleCancelEdit() : setShowAddForm(true)}>
          {showAddForm ? '閉じる' : '+ 車両登録'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCar} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: editingCar ? '#e63946' : '#2a9d8f' }}>
                {editingCar ? '📝 車両情報の修正' : '✨ 新規車両の登録'}
              </h4>
              <p style={{ margin: '0.4rem 0 1rem 0', fontSize: '0.8rem', color: '#e63946' }}>* は必須項目です</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>所有者名*</label>
              <input 
                type="text" 
                value={newCar.owner_name} 
                onChange={(e) => setNewCar({...newCar, owner_name: e.target.value})}
                placeholder="例：山田"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>最大定員（運転手含）*</label>
              <input 
                type="number" 
                value={newCar.max_seats} 
                onChange={(e) => setNewCar({...newCar, max_seats: parseInt(e.target.value)})}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
                min={1}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>車種</label>
              <input 
                type="text" 
                value={newCar.car_model} 
                onChange={(e) => setNewCar({...newCar, car_model: e.target.value})}
                placeholder="例：セレナ"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>色</label>
              <input 
                type="text" 
                value={newCar.car_color} 
                onChange={(e) => setNewCar({...newCar, car_color: e.target.value})}
                placeholder="例：白"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>通常時の提供設定</label>
              <select 
                value={newCar.is_available ? 'true' : 'false'} 
                onChange={(e) => setNewCar({...newCar, is_available: e.target.value === 'true'})}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="true">通常は提供可能</option>
                <option value="false">通常は提供不可</option>
              </select>
              <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.4rem' }}>※実際の可否は各予定の出欠回答で選択します</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>備考（任意）</label>
              <textarea 
                value={newCar.notes} 
                onChange={(e) => setNewCar({...newCar, notes: e.target.value})}
                placeholder="チャイルドシートの有無、キャリアの有無など"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd', minHeight: '60px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              {editingCar && (
                <button type="button" className="btn-secondary" onClick={handleCancelEdit} style={{ padding: '0.8rem 2rem' }}>キャンセル</button>
              )}
              <button type="submit" className="btn-primary" style={{ padding: '0.8rem 2rem' }}>
                {editingCar ? '修正を保存する' : '車両を登録する'}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>所有者</th>
                <th>車両詳細</th>
                <th>最大定員</th>
                <th>基本提供</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {cars.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>登録された車両はありません</td></tr>
              ) : (
                cars.map((c) => (
                  <tr key={c.id} style={{ background: editingCar?.id === c.id ? '#fff3cd' : 'transparent' }}>
                    <td style={{ fontWeight: 600 }}>{c.owner_name}</td>
                    <td>
                      <div style={{ fontSize: '0.9rem' }}>{c.car_model || '-'} ({c.car_color || '-'})</div>
                      {c.notes && <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>{c.notes}</div>}
                    </td>
                    <td>{c.max_seats} 名 <span style={{ fontSize: '0.7rem', color: '#888' }}>(運転手含)</span></td>
                    <td>
                      <span className={`badge ${c.is_available ? 'badge-success' : 'badge-danger'}`}>
                        {c.is_available ? '可能' : '不可'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleEditClick(c)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        修正
                      </button>
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

export default CarManager;
