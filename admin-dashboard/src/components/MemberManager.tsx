import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface Member {
  id: string;
  name: string;
  role: string;
  number?: string;
  nickname?: string;
  grade?: string;
  line_user_id?: string;
  elementary_school?: string;
}

const MemberManager: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({ 
    name: '', 
    role: 'player', 
    number: '', 
    nickname: '', 
    grade: '',
    elementary_school: '' 
  });

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
      const tempId = `temp_${Date.now()}`;
      await setDoc(doc(db, "members", tempId), {
        ...newMember,
        line_user_id: null,
        created_at: new Date()
      });
      setNewMember({ name: '', role: 'player', number: '', nickname: '', grade: '', elementary_school: '' });
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
        <form onSubmit={handleAddMember} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>氏名*</label>
              <input 
                type="text" 
                value={newMember.name} 
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                placeholder="例：山田 太郎"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>役割</label>
              <select 
                value={newMember.role} 
                onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="player">選手</option>
                <option value="coach">指導者</option>
                <option value="parent">保護者</option>
              </select>
            </div>
            {newMember.role === 'player' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>背番号</label>
                  <input 
                    type="text" 
                    value={newMember.number} 
                    onChange={(e) => setNewMember({...newMember, number: e.target.value})}
                    placeholder="例：10"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>ニックネーム</label>
                  <input 
                    type="text" 
                    value={newMember.nickname} 
                    onChange={(e) => setNewMember({...newMember, nickname: e.target.value})}
                    placeholder="例：ハルタ"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>学年</label>
                  <input 
                    type="text" 
                    value={newMember.grade} 
                    onChange={(e) => setNewMember({...newMember, grade: e.target.value})}
                    placeholder="例：6"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
              </>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>所属（学校等）</label>
              <input 
                type="text" 
                value={newMember.elementary_school} 
                onChange={(e) => setNewMember({...newMember, elementary_school: e.target.value})}
                placeholder="例：馬場小"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ height: '42px' }}>登録</button>
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
                <th>氏名</th>
                <th>役割</th>
                <th>背番号</th>
                <th>学名/略称</th>
                <th>LINE連携</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>登録メンバーがいません</td></tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>
                      <span className={`badge ${m.role === 'coach' ? 'badge-danger' : m.role === 'parent' ? 'badge-primary' : 'badge-success'}`}>
                        {m.role === 'coach' ? '指導者' : m.role === 'parent' ? '保護者' : '選手'}
                      </span>
                    </td>
                    <td>{m.number || '-'}</td>
                    <td>{m.role === 'player' ? `${m.grade || '?'}年 / ${m.nickname || '-'}` : '-'}</td>
                    <td>
                      <span style={{ color: m.line_user_id ? '#28a745' : '#dc3545', fontSize: '0.8rem' }}>
                        {m.line_user_id ? '✅ 連携済み' : '❌ 未連携'}
                      </span>
                    </td>
                    <td>
                      <button style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '0.5rem' }}>編集</button>
                      <button style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px' }}>削除</button>
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

export default MemberManager;
