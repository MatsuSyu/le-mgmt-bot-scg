import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface Member {
  id: string;
  name: string;
  role: string;
  categories: string[];
  linked_players?: string[];
  elementary_school?: string;
}

const MemberManager: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: 'parent', elementary_school: '' });

  useEffect(() => {
    const q = query(collection(db, "members"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Member[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name) return;
    try {
      // Use name as temporary ID if LINE ID is unknown, or generate a random one
      const tempId = `temp_${Date.now()}`;
      await setDoc(doc(db, "members", tempId), {
        ...newMember,
        categories: ["regular"], // Default
        created_at: new Date()
      });
      setNewMember({ name: '', role: 'parent', elementary_school: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>👥 メンバー管理</h3>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '閉じる' : '+ メンバー追加'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMember} style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>氏名</label>
              <input 
                type="text" 
                value={newMember.name} 
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                placeholder="例：山田 太郎"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>役割</label>
              <select 
                value={newMember.role} 
                onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="parent">保護者</option>
                <option value="coach">指導者</option>
                <option value="player">選手</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem' }}>小学校</label>
              <input 
                type="text" 
                value={newMember.elementary_school} 
                onChange={(e) => setNewMember({...newMember, elementary_school: e.target.value})}
                placeholder="例：第一小学校"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
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
              <th>氏名</th>
              <th>役割</th>
              <th>カテゴリ</th>
              <th>所属校</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>登録メンバーがいません</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td>
                    <span className={`badge ${m.role === 'coach' ? 'badge-danger' : m.role === 'parent' ? 'badge-primary' : 'badge-success'}`}>
                      {m.role === 'coach' ? '指導者' : m.role === 'parent' ? '保護者' : '選手'}
                    </span>
                  </td>
                  <td>{m.categories?.join(', ') || '-'}</td>
                  <td>{m.elementary_school || '-'}</td>
                  <td><button style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>詳細</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MemberManager;
