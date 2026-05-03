import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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
  meeting_time_car?: string;
  referee_needed?: boolean;
  target_categories: string[];
  description?: string;
  ai_change_comment?: string;
}

const ScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [newSchedule, setNewSchedule] = useState({ 
    date: '', 
    type: '練習', 
    location: '', 
    location_from: '',
    location_to: '',
    tournament_name: '',
    opponent: '',
    meeting_time_car: '',
    referee_needed: false,
    target: 'regular',
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, "schedules"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Schedule[] = [];
      const locs = new Set<string>();
      snapshot.forEach((doc) => {
        const s = { id: doc.id, ...doc.data() } as Schedule;
        data.push(s);
        if (s.location) locs.add(s.location);
        if (s.location_from) locs.add(s.location_from);
        if (s.location_to) locs.add(s.location_to);
      });
      setSchedules(data);
      setLocations(Array.from(locs).sort());
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEditClick = (s: Schedule) => {
    setEditingSchedule(s);
    // Convert Firestore timestamp to YYYY-MM-DD for input[type="date"]
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
      meeting_time_car: s.meeting_time_car || '',
      referee_needed: s.referee_needed || false,
      target: s.target_categories?.[0] || 'regular',
      description: s.description || ''
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSchedule(null);
    setNewSchedule({ 
      date: '', type: '練習', location: '', location_from: '', location_to: '',
      tournament_name: '', opponent: '', meeting_time_car: '', referee_needed: false, target: 'regular', description: ''
    });
    setShowAddForm(false);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.date || !newSchedule.location) {
      alert("日付と場所は必須入力です！");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_UPDATE_SCHEDULE_API;
      const payload = {
        id: editingSchedule?.id || null,
        data: {
          date: newSchedule.date,
          type: newSchedule.type,
          location: newSchedule.location,
          location_from: newSchedule.location_from,
          location_to: newSchedule.location_to,
          tournament_name: newSchedule.tournament_name,
          opponent: newSchedule.opponent,
          meeting_time_car: newSchedule.meeting_time_car,
          referee_needed: newSchedule.referee_needed,
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

  const formatScheduleDate = (date: any) => {
    if (!date) return '未設定';
    try {
      // If it's a Firestore Timestamp
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
      }
      // If it's a JS Date object
      if (date instanceof Date) {
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
      }
      // If it's a string (e.g. from a recent update that hasn't synced back as Timestamp yet)
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
      }
      return '不明な形式';
    } catch (e) {
      console.error("Date formatting error:", e, date);
      return 'エラー';
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>📅 予定管理</h3>
        <button className="btn-primary" onClick={() => showAddForm ? handleCancelEdit() : setShowAddForm(true)}>
          {showAddForm ? '閉じる' : '+ 予定追加'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSchedule} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: editingSchedule ? '#e63946' : '#2a9d8f' }}>
                {editingSchedule ? '📝 予定の編集' : '✨ 新規予定の登録'}
              </h4>
              <p style={{ margin: '0.4rem 0 1rem 0', fontSize: '0.8rem', color: '#e63946' }}>* は必須項目です</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>日付*</label>
              <input 
                type="date" 
                value={newSchedule.date} 
                onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>種別*</label>
              <select 
                value={newSchedule.type} 
                onChange={(e) => setNewSchedule({...newSchedule, type: e.target.value})}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
              >
                <option value="練習">練習</option>
                <option value="試合">試合</option>
                <option value="体験会">体験会</option>
                <option value="合宿">合宿</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>メイン場所*</label>
              <input 
                type="text" 
                list="location-suggestions"
                value={newSchedule.location} 
                onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                placeholder="例：遊水地"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                required
              />
              <datalist id="location-suggestions">
                {locations.map(loc => <option key={loc} value={loc} />)}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>対象</label>
              <select 
                value={newSchedule.target} 
                onChange={(e) => setNewSchedule({...newSchedule, target: e.target.value})}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="regular">レギュラー</option>
                <option value="junior">ジュニア</option>
                <option value="u5">5年以下</option>
                <option value="all">全員</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #ccc', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>🏆 試合詳細情報（試合の場合のみ・任意）</h4>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>大会名</label>
              <input 
                type="text" 
                value={newSchedule.tournament_name} 
                onChange={(e) => setNewSchedule({...newSchedule, tournament_name: e.target.value})}
                placeholder="例：春季大会"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>対戦相手</label>
              <input 
                type="text" 
                value={newSchedule.opponent} 
                onChange={(e) => setNewSchedule({...newSchedule, opponent: e.target.value})}
                placeholder="例：ライオンズ"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={newSchedule.referee_needed} 
                  onChange={(e) => setNewSchedule({...newSchedule, referee_needed: e.target.checked})}
                  style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                />
                審判の派遣が必要
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #ccc', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>🚗 移動・配車情報（遠征時のみ・任意）</h4>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>出発地</label>
              <input 
                type="text" 
                list="location-suggestions"
                value={newSchedule.location_from} 
                onChange={(e) => setNewSchedule({...newSchedule, location_from: e.target.value})}
                placeholder="例：遊水地"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>到着地</label>
              <input 
                type="text" 
                list="location-suggestions"
                value={newSchedule.location_to} 
                onChange={(e) => setNewSchedule({...newSchedule, location_to: e.target.value})}
                placeholder="例：馬場小"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>配車集合時間</label>
              <input 
                type="time" 
                value={newSchedule.meeting_time_car} 
                onChange={(e) => setNewSchedule({...newSchedule, meeting_time_car: e.target.value})}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #ccc', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>備考・詳細（任意）</label>
              <textarea 
                value={newSchedule.description} 
                onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
                placeholder="持ち物、雨天時の対応、弁当の有無など"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd', minHeight: '80px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              {editingSchedule && (
                <button type="button" className="btn-secondary" onClick={handleCancelEdit} style={{ padding: '0.8rem 2rem' }}>キャンセル</button>
              )}
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: '0.8rem 2rem', fontSize: '1rem', opacity: (!newSchedule.date || !newSchedule.location) ? 0.6 : 1 }}
              >
                {editingSchedule ? '変更を保存する' : '予定を登録する'}
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
                <th>日付</th>
                <th>種別</th>
                <th>場所 / 詳細</th>
                <th>対象</th>
                <th>AIコメント / 備考</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>登録された予定はありません</td></tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} style={{ background: editingSchedule?.id === s.id ? '#fff3cd' : 'transparent' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatScheduleDate(s.date)}</td>
                    <td>
                      <span className={`badge ${s.type === '試合' ? 'badge-danger' : s.type === '練習' ? 'badge-primary' : 'badge-success'}`}>
                        {s.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.location}</div>
                      {s.tournament_name && <div style={{ fontSize: '0.75rem', color: '#666' }}>{s.tournament_name} {s.opponent ? `vs ${s.opponent}` : ''}</div>}
                      {s.location_from && <div style={{ fontSize: '0.7rem', color: '#888' }}>{s.location_from} → {s.location_to}</div>}
                    </td>
                    <td>{s.target_categories?.join(', ') || '全カテゴリ'}</td>
                    <td style={{ fontSize: '0.75rem', maxWidth: '250px', color: '#555' }}>
                      {s.ai_change_comment && (
                        <div style={{ background: '#fffbe6', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ffe58f', marginBottom: '0.4rem' }}>
                          ✨ {s.ai_change_comment}
                        </div>
                      )}
                      {s.description && (
                        <div style={{ color: '#666', fontStyle: 'italic', padding: '0.2rem' }}>
                          📝 {s.description}
                        </div>
                      )}
                      {!s.ai_change_comment && !s.description && '-'}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleEditClick(s)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        編集
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

export default ScheduleManager;
