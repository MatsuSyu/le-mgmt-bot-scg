import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

interface Schedule {
  id: string;
  date: any;
  type: string;
  location: string;
  location_from?: string;
  location_to?: string;
  tournament_name?: string;
  opponent?: string;
  meeting_time?: string;
  meeting_time_car?: string;
  referee_needed?: boolean;
  target_categories: string[];
  description?: string;
  ai_change_comment?: string;
  has_lunch?: boolean;
}

const ScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'team' | 'school'>('team');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [newSchedule, setNewSchedule] = useState({ 
    date: '', 
    type: '練習', 
    location: '', 
    location_from: '',
    location_to: '',
    tournament_name: '',
    opponent: '',
    meeting_time: '',
    meeting_time_car: '',
    referee_needed: false,
    has_lunch: false,
    target: 'all',
    description: ''
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [filter, setFilter] = useState({
    startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    endDate: '',
    target: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

    // Fetch suggestions
    fetch(import.meta.env.VITE_SUGGESTIONS_API)
      .then(res => res.json())
      .then(data => setSuggestions(data))
      .catch(err => console.error("Suggestions fetch failed", err));

    return () => unsubscribe();
  }, []);

  const categoryPriority: Record<string, number> = {
    'regular': 1,
    'junior': 2,
    'u5': 3,
    'all': 4
  };

  const filteredSchedules = schedules
    .filter(s => {
      const isSchool = s.type === '学校行事';
      if (activeTab === 'team' && isSchool) return false;
      if (activeTab === 'school' && !isSchool) return false;

      const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      const sDateStr = sDate.toISOString().split('T')[0];
      if (filter.startDate && sDateStr < filter.startDate) return false;
      if (filter.endDate && sDateStr > filter.endDate) return false;
      if (filter.target !== 'all' && !s.target_categories?.includes(filter.target)) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
      const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB; // Date Ascending
      
      const pA = categoryPriority[a.target_categories?.[0] || 'all'] || 99;
      const pB = categoryPriority[b.target_categories?.[0] || 'all'] || 99;
      return pA - pB;
    });

  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const paginatedSchedules = filteredSchedules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEditClick = (s: Schedule) => {
    setEditingSchedule(s);
    let dateStr = '';
    if (s.date) {
      const d = s.date.toDate ? s.date.toDate() : new Date(s.date);
      dateStr = d.toISOString().split('T')[0];
    }

    setNewSchedule({
      date: dateStr,
      type: s.type || '練習',
      location: s.location || '',
      location_from: s.location_from || '',
      location_to: s.location_to || '',
      tournament_name: s.tournament_name || '',
      opponent: s.opponent || '',
      meeting_time: s.meeting_time || '',
      meeting_time_car: s.meeting_time_car || '',
      referee_needed: s.referee_needed || false,
      has_lunch: s.has_lunch || false,
      target: s.target_categories?.[0] || 'all',
      description: s.description || ''
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSchedule(null);
    setNewSchedule({ 
      date: '', type: activeTab === 'school' ? '学校行事' : '練習', location: '', location_from: '', location_to: '',
      tournament_name: '', opponent: '', meeting_time: '', meeting_time_car: '', referee_needed: false, has_lunch: false, target: 'all', description: ''
    });
    setShowAddForm(false);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.date || !newSchedule.location) {
      alert("日付と名称/場所は必須入力です！");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_UPDATE_SCHEDULE_API;
      const payload = {
        id: editingSchedule?.id || null,
        data: {
          date: newSchedule.date,
          type: activeTab === 'school' ? '学校行事' : newSchedule.type,
          location: newSchedule.location,
          location_from: newSchedule.location_from,
          location_to: newSchedule.location_to,
          tournament_name: newSchedule.tournament_name,
          opponent: newSchedule.opponent,
          meeting_time: newSchedule.meeting_time,
          meeting_time_car: newSchedule.meeting_time_car,
          referee_needed: newSchedule.referee_needed,
          has_lunch: newSchedule.has_lunch,
          target_categories: [newSchedule.target],
          description: newSchedule.description
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        handleCancelEdit();
      } else {
        alert("登録・更新に失敗しました。");
      }
    } catch (error) {
      console.error("Error adding/updating schedule:", error);
      alert("通信エラーが発生しました。");
    }
  };

  const handleDeleteSchedule = async (id: string, date: any) => {
    const dateStr = formatScheduleDate(date);
    if (!window.confirm(`「${dateStr}」の予定を削除してもよろしいですか？\nこの操作は取り消せません。`)) return;
    try {
      await deleteDoc(doc(db, "schedules", id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("削除に失敗しました。");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`選択した ${selectedIds.length} 件の予定を一括削除してもよろしいですか？\nこの操作は取り消せません。`)) return;

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, "schedules", id));
      });
      await batch.commit();
      alert("一括削除が完了しました。");
      setSelectedIds([]);
    } catch (err) {
      console.error("Bulk delete error:", err);
      alert("一括削除に失敗しました。");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSchedules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSchedules.map(s => s.id));
    }
  };

  const toggleSelectSchedule = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatScheduleDate = (date: any) => {
    if (!date) return '未設定';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
      return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}(${week})`;
    } catch (e) {
      return 'エラー';
    }
  };

  const [selectedAttendance, setSelectedAttendance] = useState<any[]>([]);
  const [viewingAttendanceFor, setViewingAttendanceFor] = useState<Schedule | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  const handleViewAttendance = async (s: Schedule) => {
    setViewingAttendanceFor(s);
    setLoadingAttendance(true);
    try {
      if (Object.keys(memberNames).length === 0) {
        const memSnapshot = await getDocs(collection(db, "members"));
        const names: Record<string, string> = {};
        memSnapshot.forEach(doc => {
          names[doc.id] = doc.data().name || "不明";
        });
        setMemberNames(names);
      }

      const q = query(collection(db, "attendance"), where("schedule_id", "==", s.id));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSelectedAttendance(data);
    } catch (err) {
      console.error("Error fetching attendance details:", err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const generateCompressedText = () => {
    if (filteredSchedules.length === 0) return "予定がありません。";
    
    const lines = filteredSchedules.map(s => {
      const dateStr = formatScheduleDate(s.date);
      const isSchoolEvent = s.type === '学校行事';
      const emoji = isSchoolEvent ? '🏫' : '🗓';
      const timeStr = (!isSchoolEvent && s.meeting_time) ? ` ${s.meeting_time}集合` : '';
      const typeStr = ` ${s.type}`;
      const targetStr = (s.target_categories && s.target_categories[0] !== 'all') ? `(${s.target_categories.join(',')})` : '';
      const locStr = ` ＠${s.location}`;
      
      let extra = [];
      if (s.tournament_name || s.opponent) {
        let matchInfo = [];
        if (s.tournament_name) matchInfo.push(s.tournament_name);
        if (s.opponent) matchInfo.push(`vs ${s.opponent}`);
        extra.push(`[${matchInfo.join(' ')}]`);
      }
      
      if (!isSchoolEvent && s.location_from && s.location_to) {
        extra.push(`🚗${s.location_from}→${s.location_to}${s.meeting_time_car ? `(${s.meeting_time_car}配車)` : ''}`);
      }
      
      if (s.has_lunch) {
        extra.push('🍱弁当必要');
      }
      
      if (s.description) {
        extra.push(`※${s.description.replace(/\n/g, ' ')}`);
      }

      const mainLine = `${emoji}${dateStr}${timeStr}${typeStr}${targetStr}${locStr}`;
      if (extra.length > 0) {
        return `${mainLine}\n  └ ${extra.join(' ')}`;
      }
      return mainLine;
    });

    return `【${activeTab === 'school' ? '学校行事予定' : 'チーム予定表'}】\n${lines.join('\n\n')}`;
  };

  const [copying, setCopying] = useState(false);
  const handleCopyText = async () => {
    const text = generateCompressedText();
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      alert('クリップボードにコピーしました！');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('クリップボードにコピーしました！');
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="card">
      <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #edf2f4' }}>
        <button 
          className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('team'); setShowAddForm(false); }}
          style={{ padding: '0.8rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'team' ? '3px solid var(--primary)' : 'none', fontWeight: 700, cursor: 'pointer', color: activeTab === 'team' ? 'var(--primary)' : '#8d99ae' }}
        >
          ⚾ チーム予定
        </button>
        <button 
          className={`tab-btn ${activeTab === 'school' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('school'); setShowAddForm(false); }}
          style={{ padding: '0.8rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'school' ? '3px solid var(--warning)' : 'none', fontWeight: 700, cursor: 'pointer', color: activeTab === 'school' ? 'var(--warning)' : '#8d99ae' }}
        >
          🏫 学校行事予定
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>{activeTab === 'team' ? '⚾ チーム予定管理' : '🏫 学校行事・その他管理'}</h3>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          {selectedIds.length > 0 && (
            <button className="btn-secondary" onClick={handleBulkDelete} style={{ background: '#ff4d4f', color: 'white', border: 'none' }}>
              🗑️ {selectedIds.length}件を一括削除
            </button>
          )}
          <button className={activeTab === 'team' ? "btn-primary" : "btn-warning"} onClick={() => showAddForm ? handleCancelEdit() : setShowAddForm(true)}>
            {showAddForm ? '閉じる' : activeTab === 'team' ? '+ 予定追加' : '+ 行事追加'}
          </button>
        </div>
      </div>

      {viewingAttendanceFor && (
        <div className="modal-overlay" onClick={() => setViewingAttendanceFor(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h4>📊 出欠詳細: {formatScheduleDate(viewingAttendanceFor.date)} {viewingAttendanceFor.location}</h4>
              <button className="btn-secondary" onClick={() => setViewingAttendanceFor(null)}>閉じる</button>
            </div>
            
            {loadingAttendance ? <p>読み込み中...</p> : (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>名前</th>
                      <th>ステータス</th>
                      <th>配車</th>
                      <th>備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAttendance.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center' }}>まだ回答がありません</td></tr>
                    ) : (
                      selectedAttendance.map(a => (
                        <tr key={a.id}>
                          <td>{memberNames[a.user_id] || a.user_id}</td>
                          <td>
                            <span className={`badge ${a.status === '出席' ? 'badge-success' : 'badge-danger'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td>{a.car_info?.mode || '-'}</td>
                          <td style={{ fontSize: '0.8rem' }}>{a.remarks || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddSchedule} style={{ marginBottom: '2rem', padding: '1.2rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: editingSchedule ? '#e63946' : activeTab === 'team' ? '#2a9d8f' : '#f4a261' }}>
                {editingSchedule ? '📝 編集' : `✨ ${activeTab === 'team' ? 'チーム予定' : '学校行事'}の登録`}
              </h4>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold' }}>日付*</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="date" 
                  value={newSchedule.date} 
                  onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                  style={{ flex: 2, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  required
                />
                {activeTab === 'team' && (
                  <input 
                    type="time" 
                    value={newSchedule.meeting_time} 
                    onChange={(e) => setNewSchedule({...newSchedule, meeting_time: e.target.value})}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    placeholder="集合"
                  />
                )}
              </div>
            </div>

            {activeTab === 'team' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold' }}>種別*</label>
                <select 
                  value={newSchedule.type} 
                  onChange={(e) => setNewSchedule({...newSchedule, type: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  required
                >
                  <option value="練習">練習</option>
                  <option value="試合">試合</option>
                  <option value="体験会">体験会</option>
                  <option value="合宿">合宿</option>
                  <option value="球場確保">球場確保</option>
                  <option value="その他">その他</option>
                </select>
              </div>
            ) : null}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold' }}>{activeTab === 'team' ? 'メイン場所*' : '行事名/場所*'}</label>
              <input 
                type="text" 
                list="location-suggestions"
                value={newSchedule.location} 
                onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                placeholder={activeTab === 'team' ? "例：遊水地" : "例：菊名小 修学旅行"}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
              />
              <datalist id="location-suggestions">
                {(suggestions.location || []).map(loc => <option key={loc} value={loc} />)}
              </datalist>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold' }}>対象学年</label>
              <select 
                value={newSchedule.target} 
                onChange={(e) => setNewSchedule({...newSchedule, target: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="all">全員</option>
                <option value="regular">レギュラー</option>
                <option value="junior">ジュニア</option>
                <option value="u5">5年以下</option>
              </select>
            </div>

            {activeTab === 'team' && (
              <>
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #ccc', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>🏆 試合詳細情報（試合の場合のみ・任意）</h4>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold' }}>大会名</label>
                  <input 
                    type="text" 
                    list="tournament-suggestions"
                    value={newSchedule.tournament_name} 
                    onChange={(e) => setNewSchedule({...newSchedule, tournament_name: e.target.value})}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                  <datalist id="tournament-suggestions">
                    {(suggestions.tournament_name || []).map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: 'bold' }}>対戦相手</label>
                  <input 
                    type="text" 
                    list="opponent-suggestions"
                    value={newSchedule.opponent} 
                    onChange={(e) => setNewSchedule({...newSchedule, opponent: e.target.value})}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                  <datalist id="opponent-suggestions">
                    {(suggestions.opponent || []).map(o => <option key={o} value={o} />)}
                  </datalist>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newSchedule.referee_needed} 
                      onChange={(e) => setNewSchedule({...newSchedule, referee_needed: e.target.checked})}
                      style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                    />
                    審判派遣が必要
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newSchedule.has_lunch} 
                      onChange={(e) => setNewSchedule({...newSchedule, has_lunch: e.target.checked})}
                      style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                    />
                    🍱 弁当必要
                  </label>
                </div>

                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #ccc', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>🚗 移動・配車情報</h4>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>出発地</label>
                  <input type="text" value={newSchedule.location_from} onChange={(e) => setNewSchedule({...newSchedule, location_from: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>到着地</label>
                  <input type="text" value={newSchedule.location_to} onChange={(e) => setNewSchedule({...newSchedule, location_to: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>配車時間</label>
                  <input type="time" value={newSchedule.meeting_time_car} onChange={(e) => setNewSchedule({...newSchedule, meeting_time_car: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                </div>
              </>
            )}

            <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #ccc', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>備考・詳細</label>
              <textarea 
                value={newSchedule.description} 
                onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
                placeholder="持ち物、注意事項など"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd', minHeight: '80px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={handleCancelEdit}>キャンセル</button>
              <button type="submit" className={activeTab === 'team' ? "btn-primary" : "btn-warning"}>
                {editingSchedule ? '保存' : '登録'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="filter-bar" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', background: '#fff', padding: '1rem', borderRadius: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', color: '#888' }}>開始日</label>
          <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', color: '#888' }}>対象</label>
          <select value={filter.target} onChange={e => setFilter({...filter, target: e.target.value})} style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="all">全て</option>
            <option value="regular">レギュラー</option>
            <option value="junior">ジュニア</option>
          </select>
        </div>
        <div style={{ marginRight: 'auto' }}></div>
        <button 
          onClick={handleCopyText} 
          disabled={copying || filteredSchedules.length === 0}
          className="btn-line"
          style={{ background: '#00B900', color: 'white', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '20px', fontWeight: 'bold' }}
        >
          {activeTab === 'team' ? '📋 チーム予定をコピー' : '🏫 行事予定をコピー'}
        </button>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dense-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length > 0 && selectedIds.length === filteredSchedules.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>日付</th>
                {activeTab === 'team' && <th>集合</th>}
                <th>{activeTab === 'team' ? '種別' : '内容'}</th>
                <th>場所 / 詳細</th>
                <th>対象</th>
                <th>備考</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSchedules.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999' }}>予定はありません</td></tr>
              ) : (
                paginatedSchedules.map((s) => (
                  <tr key={s.id} style={{ background: editingSchedule?.id === s.id ? '#fff3cd' : 'transparent' }}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelectSchedule(s.id)}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{formatScheduleDate(s.date)}</td>
                    {activeTab === 'team' && <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{s.meeting_time || '-'}</td>}
                    <td>
                      <span className={`badge ${s.type === '試合' ? 'badge-danger' : s.type === '練習' ? 'badge-primary' : 'badge-warning'}`}>
                        {s.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.location}</div>
                      {s.tournament_name && <div style={{ fontSize: '0.7rem', color: '#666' }}>{s.tournament_name}</div>}
                    </td>
                    <td>{s.target_categories?.join(', ') || '全員'}</td>
                    <td style={{ fontSize: '0.75rem', color: '#666' }}>
                      {s.has_lunch && <span style={{ color: '#e63946', fontWeight: 'bold', marginRight: '0.5rem' }}>[🍱弁当]</span>}
                      {s.description}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => handleEditClick(s)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>編集</button>
                        {activeTab === 'team' && <button className="btn-secondary" onClick={() => handleViewAttendance(s)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>出欠</button>}
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleDeleteSchedule(s.id, s.date)} 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e' }}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="btn-secondary">前へ</button>
          <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>{currentPage} / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="btn-secondary">次へ</button>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
