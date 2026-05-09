import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

interface Member {
  id: string;
  name: string;
  role: string;
  number?: string;
  nickname?: string;
  grade?: string;
  line_user_id?: string;
  line_display_name?: string;
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
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      
      // Sort by uniform number (numerically)
      data.sort((a, b) => {
        const numA = parseInt(a.number || '999');
        const numB = parseInt(b.number || '999');
        if (numA !== numB) return numA - numB;
        return a.name.localeCompare(b.name, 'ja-JP');
      });

      setMembers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBulkAdd = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    if (!window.confirm(`${lines.length}名のメンバーを一括登録します。よろしいですか？`)) return;

    try {
      const batch = writeBatch(db);
      lines.forEach((line, index) => {
        const parts = line.split(/[,\s]+/).map(p => p.trim());
        const name = parts[0];
        if (!name) return;

        const grade = parts[1] || '';
        const number = parts[2] || '';
        const short_name = parts[3] || '';
        let role = parts[4] || 'player';
        const nickname = parts[5] || '';

        // Auto-detect role if not explicitly provided or if provided as keyword
        const roleLower = role.toLowerCase();
        if (roleLower.includes('指導者') || roleLower.includes('監督') || roleLower.includes('コーチ') || roleLower.includes('coach')) {
          role = 'coach';
        } else if (roleLower.includes('母') || roleLower.includes('父') || roleLower.includes('保護者') || roleLower.includes('parent')) {
          role = 'parent';
        } else if (roleLower.includes('選手') || roleLower.includes('player')) {
          role = 'player';
        }

        const tempId = `bulk_${Date.now()}_${index}`;
        const memberRef = doc(db, "members", tempId);
        
        batch.set(memberRef, {
          name,
          role: role,
          grade: grade,
          number: number,
          short_name: short_name,
          nickname: nickname,
          line_user_id: null,
          created_at: new Date()
        });
      });

      await batch.commit();
      alert("一括登録が完了しました！");
      setBulkText('');
      setShowBulkForm(false);
    } catch (err) {
      console.error(err);
      alert("一括登録中にエラーが発生しました。");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.role) {
      alert("氏名と役割は必須入力です！");
      return;
    }
    try {
      if (editingMember) {
        await setDoc(doc(db, "members", editingMember.id), {
          ...newMember,
          updated_at: new Date()
        }, { merge: true });
        alert("更新しました。");
      } else {
        const tempId = `temp_${Date.now()}`;
        await setDoc(doc(db, "members", tempId), {
          ...newMember,
          line_user_id: null,
          created_at: new Date()
        });
        alert("登録しました。");
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Error adding/updating member:", error);
      alert("処理に失敗しました。");
    }
  };

  const handleEditClick = (m: Member) => {
    setEditingMember(m);
    setNewMember({
      name: m.name,
      role: m.role,
      number: m.number || '',
      nickname: m.nickname || '',
      grade: m.grade || '',
      school_name: m.school_name || '',
      short_name: m.short_name || '',
      emergency_contact: m.emergency_contact || '',
      allergies: m.allergies || '',
      notes: m.notes || ''
    });
    setShowAddForm(true);
    setShowBulkForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setNewMember({ 
      name: '', role: 'player', number: '', nickname: '', grade: '', 
      school_name: '', short_name: '', emergency_contact: '', allergies: '', notes: '' 
    });
    setShowAddForm(false);
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, "members", id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("削除に失敗しました。");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`選択した ${selectedIds.length} 名のメンバーを一括削除してもよろしいですか？\nこの操作は取り消せません。`)) return;

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, "members", id));
      });
      await batch.commit();
      alert("一括削除が完了しました。");
      setSelectedIds([]);
    } catch (err) {
      console.error("Bulk delete error:", err);
      alert("一括削除に失敗しました。");
    }
  };

  const refreshLineProfile = async (memberId: string, lineUserId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/get_line_profile?user_id=${lineUserId}`);
      if (response.ok) {
        const profile = await response.json();
        if (profile.displayName) {
          await setDoc(doc(db, "members", memberId), {
            line_display_name: profile.displayName,
            updated_at: new Date()
          }, { merge: true });
          alert(`LINE名を更新しました: ${profile.displayName}`);
        } else {
          alert("LINEプロフィール情報が取得できませんでした（友だち登録が解除されている可能性があります）。");
        }
      } else {
        alert("LINEプロフィールの取得に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました。");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map(m => m.id));
    }
  };

  const toggleSelectMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>👥 メンバー管理</h3>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          {selectedIds.length > 0 && (
            <button className="btn-secondary" onClick={handleBulkDelete} style={{ background: '#ff4d4f', color: 'white', border: 'none' }}>
              🗑️ {selectedIds.length}名を一括削除
            </button>
          )}
          <button className="btn-secondary" onClick={() => { setShowBulkForm(!showBulkForm); setShowAddForm(false); }}>
            {showBulkForm ? '閉じる' : '一括追加'}
          </button>
          <button className="btn-primary" onClick={() => { setShowAddForm(!showAddForm); setShowBulkForm(false); }}>
            {showAddForm ? '閉じる' : '+ メンバー追加'}
          </button>
        </div>
      </div>

      {showBulkForm && (
        <div className="card" style={{ marginBottom: '2rem', background: '#f0f4f8', border: '1px solid #d1d9e6' }}>
          <h4 style={{ marginBottom: '1rem' }}>📦 メンバー一括登録</h4>
          <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>
            1行に1人ずつ入力してください。カンマ区切りで詳細も指定できます。<br/>
            書式: <code>氏名, 学年, 背番号, 学校略称, 役割(任意), ニックネーム(任意)</code><br/>
            例: <code>山田太郎, 5, 10, 馬場小, 選手, タロウ</code><br/>
            ※役割は「指導者」「保護者」「選手」などのキーワードが含まれていれば自動判別します。
          </p>
          <textarea 
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="山田太郎, 6, 1, 馬場小, 選手, タロウ&#10;佐藤次郎, 5, 2, 馬場小, 選手, ジロウ"
            style={{ width: '100%', minHeight: '150px', padding: '1rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '1rem', fontFamily: 'monospace' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleBulkAdd} disabled={!bulkText.trim()}>
              この内容で一括登録を実行する
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddMember} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: editingMember ? '#e63946' : '#2a9d8f' }}>
                {editingMember ? `📝 ${editingMember.name} の編集` : '✨ 新規メンバー登録'}
              </h4>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#8d99ae' }}>* は必須項目です</p>
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
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={handleCancelEdit}>キャンセル</button>
              <button type="submit" className="btn-primary" style={{ padding: '0.6rem 2rem' }}>
                {editingMember ? '変更を保存する' : 'メンバーを登録する'}
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
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={members.length > 0 && selectedIds.length === members.length}
                    onChange={toggleSelectAll}
                  />
                </th>
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
                  <tr key={m.id} style={{ background: selectedIds.includes(m.id) ? '#fff1f0' : 'transparent' }}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleSelectMember(m.id)}
                      />
                    </td>
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
                      {m.line_user_id ? (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#00B900', fontWeight: 'bold' }}>✅ 連携済み</div>
                          {m.line_display_name && <div style={{ fontSize: '0.7rem', color: '#666' }}>({m.line_display_name})</div>}
                          <button 
                            className="btn-secondary"
                            onClick={() => refreshLineProfile(m.id, m.line_user_id!)}
                            style={{ fontSize: '0.65rem', padding: '2px 6px', marginTop: '4px', height: 'auto', minHeight: 'unset' }}
                          >
                            🔄 名前更新
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#ccc' }}>未連携</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '0.5rem' }}
                        onClick={() => handleEditClick(m)}
                      >
                        編集
                      </button>
                      <button 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => handleDeleteMember(m.id, m.name)}
                      >
                        削除
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

export default MemberManager;
