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
  school_name?: string;
  short_name?: string;
  emergency_contact?: string;
  allergies?: string;
  notes?: string;
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
    school_name: '',
    short_name: '',
    emergency_contact: '',
    allergies: '',
    notes: ''
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
    if (!newMember.name || !newMember.role) {
      alert("氏名と役割は必須入力です！");
      return;
    }
    try {
      const tempId = `temp_${Date.now()}`;
      await setDoc(doc(db, "members", tempId), {
        ...newMember,
        line_user_id: null,
        created_at: new Date()
      });
      setNewMember({ 
        name: '', role: 'player', number: '', nickname: '', grade: '', 
        school_name: '', short_name: '', emergency_contact: '', allergies: '', notes: '' 
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding member:", error);
      alert("登録に失敗しました。");
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#e63946' }}>* は必須項目です</h4>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>氏名*</label>
              <input 
                type="text" 
                value={newMember.name} 
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                placeholder="例：山田 太郎（姓名の間にスペース）"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>役割*</label>
              <select 
                value={newMember.role} 
                onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
              >
                <option value="player">選手</option>
                <option value="coach">指導者</option>
                <option value="parent">保護者</option>
                <option value="coach_parent">指導者 兼 保護者</option>
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
                    placeholder="例：タロウ"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>学年</label>
                  <select 
                    value={newMember.grade} 
                    onChange={(e) => setNewMember({...newMember, grade: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="">未選択（任意）</option>
                    {[1, 2, 3, 4, 5, 6].map(g => (
                      <option key={g} value={String(g)}>{g}年生</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>学校名</label>
              <input 
                type="text" 
                list="school-suggestions"
                value={newMember.school_name} 
                onChange={(e) => setNewMember({...newMember, school_name: e.target.value})}
                placeholder="例：馬場小学校"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <datalist id="school-suggestions">
                {Array.from(new Set(members.map(m => m.school_name).filter(Boolean))).sort().map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>略称（名簿用）</label>
              <input 
                type="text" 
                value={newMember.short_name} 
                onChange={(e) => setNewMember({...newMember, short_name: e.target.value})}
                placeholder="例：馬場小"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>緊急連絡先</label>
              <input 
                type="text" 
                value={newMember.emergency_contact} 
                onChange={(e) => setNewMember({...newMember, emergency_contact: e.target.value})}
                placeholder="例：090-0000-0000（母）"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>アレルギー・留意事項</label>
              <input 
                type="text" 
                value={newMember.allergies} 
                onChange={(e) => setNewMember({...newMember, allergies: e.target.value})}
                placeholder="特になければ空欄"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>備考</label>
              <textarea 
                value={newMember.notes} 
                onChange={(e) => setNewMember({...newMember, notes: e.target.value})}
                placeholder="その他の情報（例：兄弟が在団中、卒団生など）"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd', minHeight: '60px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" style={{ padding: '0.6rem 2rem' }}>メンバーを登録する</button>
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
                <th>氏名</th>
                <th>役割</th>
                <th>背番号</th>
                <th>所属/学年</th>
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
                    <td style={{ fontWeight: 600 }}>
                      <div>{m.name}</div>
                      {m.nickname && <div style={{ fontSize: '0.7rem', color: '#666' }}>（{m.nickname}）</div>}
                    </td>
                    <td>
                      <span className={`badge ${
                        m.role === 'coach' ? 'badge-danger' : 
                        m.role === 'parent' ? 'badge-primary' : 
                        m.role === 'coach_parent' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {m.role === 'coach' ? '指導者' : 
                         m.role === 'parent' ? '保護者' : 
                         m.role === 'coach_parent' ? '指導者/保護者' : '選手'}
                      </span>
                    </td>
                    <td>{m.number || '-'}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{m.short_name || m.school_name || (m as any).elementary_school || '-'}</div>
                      {m.role === 'player' && <div style={{ fontSize: '0.75rem', color: '#888' }}>{m.grade || '?'} 年</div>}
                    </td>
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
