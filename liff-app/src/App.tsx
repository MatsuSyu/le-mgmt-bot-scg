import { useState, useEffect } from 'react'
import liff from '@line/liff'
import './index.css'

interface Member {
  id: string;
  name: string;
  role: string;
  nickname?: string;
  number?: string;
  grade?: string;
  target_categories?: string[];
}

function App() {
  const [step, setStep] = useState<'loading' | 'linkage' | 'selection' | 'schedule_list' | 'form' | 'submitted'>('loading')
  const [userId, setUserId] = useState<string>('')
  const [linkedMembers, setLinkedMembers] = useState<Member[]>([])
  const [unlinkedMembers, setUnlinkedMembers] = useState<Member[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [selectedForAttendance, setSelectedForAttendance] = useState<string[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [activeCategory, setActiveCategory] = useState<'team' | 'school' | 'ground'>('team')
  
  const [status, setStatus] = useState<'出席' | '欠席' | '遅刻' | '早退' | ''>('')
  const [carMode, setCarMode] = useState<'車出し可能' | '同乗希望' | '不要' | ''>('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filterRange, setFilterRange] = useState<'recent' | 'month' | 'past'>('recent')

  const SUBMIT_API = import.meta.env.VITE_API_URL;
  const INIT_API = import.meta.env.VITE_INIT_API_URL;
  const MEMBER_API = import.meta.env.VITE_MEMBER_API_URL;
  const UNLINK_API = import.meta.env.VITE_UNLINK_API_URL;

  // Helper to determine category from grade
  const getCategory = (grade?: string): 'regular' | 'junior' | 'all' => {
    if (!grade) return 'all';
    const g = parseInt(grade);
    if (isNaN(g)) return 'all';
    return g >= 5 ? 'regular' : 'junior';
  };

  const fetchData = async () => {
    try {
      let lineId = 'test_user_123'
      if (liff.isLoggedIn()) {
        lineId = liff.getContext()?.userId || ''
      }
      setUserId(lineId)

      const initRes = await fetch(`${INIT_API}?line_user_id=${lineId}`)
      if (initRes.ok) {
        const data = await initRes.json()
        setSchedules(data.schedules || [])
        setLinkedMembers(data.linked_members || [])
        setUnlinkedMembers(data.unlinked_members || [])
        setAllMembers(data.all_members || [])
        setAttendance(data.attendance || [])

        if (data.linked_members && data.linked_members.length > 0) {
          if (step === 'loading') {
            setSelectedForAttendance(data.linked_members.map((m: any) => m.id))
            setStep('selection')
          }
        } else {
          setStep('linkage')
        }
      }
    } catch (err) {
      console.error("Fetch failed", err)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
        await fetchData()
      } catch (err) {
        console.error("Init failed", err)
        setStep('selection')
      }
    }
    init()
  }, [])

  const handleLinkMember = async (memberId: string) => {
    try {
      await fetch(MEMBER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, line_user_id: userId })
      })
      alert("連携しました！")
      fetchData()
    } catch (err) {
      alert("連携に失敗しました")
    }
  }

  const handleUnlink = async (memberId: string) => {
    if (!confirm("連携を解除しますか？")) return;
    try {
      const res = await fetch(UNLINK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId })
      })
      if (res.ok) {
        alert("解除しました")
        fetchData()
      }
    } catch (err) {
      alert("解除に失敗しました")
    }
  }

  const handleSubmit = async () => {
    if (!status || selectedForAttendance.length === 0) return;
    if (status !== '欠席' && !carMode) return;
    
    const currentSchedule = schedules.find(s => s.id === selectedScheduleId);
    if (!currentSchedule) return;

    setSubmitting(true);
    try {
      const response = await fetch(SUBMIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: selectedForAttendance,
          schedule_id: currentSchedule.id,
          status: status,
          car_info: { mode: status === '欠席' ? '不要' : carMode },
          remarks: remarks
        })
      });
      if (response.ok) {
        setStep('submitted');
        fetchData(); // Refresh to show latest attendance
      } else {
        alert("登録に失敗しました。");
      }
    } catch (err) {
      alert("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'loading') return <div className="loading-overlay">Loading...</div>

  if (step === 'submitted') {
    return (
      <div className="liff-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ marginBottom: '1rem' }}>登録完了！</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
          出欠の回答を受け付けました。<br />
          ナイスプレイ！
        </p>
        <button 
          className="btn-submit" 
          onClick={() => setStep('schedule_list')}
          style={{ background: '#f1f3f5', color: '#333', marginBottom: '1rem' }}
        >
          他の予定も回答する
        </button>
        <button 
          className="btn-submit" 
          onClick={() => liff.closeWindow()}
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          LINEに戻る
        </button>
      </div>
    )
  }

  if (step === 'linkage') {
    return (
      <div className="liff-container">
        <header className="header">
          <h1>名簿連携</h1>
          <p>あなた（またはお子様）の名前を選択してください</p>
        </header>
        <div className="member-list">
          {unlinkedMembers.map(m => (
            <div key={m.id} className="member-item" onClick={() => handleLinkMember(m.id)}>
              <div className="member-info">
                <span className="member-name">{m.name}</span>
                <span className="member-detail">
                  {m.role === 'player' ? `${m.grade}年 / ${m.nickname}` : 
                   m.role === 'coach' ? '指導者' : 
                   m.role === 'parent' ? '保護者' : 
                   m.role === 'coach_parent' ? '指導者/保護者' : m.role}
                </span>
              </div>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>連携 ＞</span>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setStep('selection')} style={{ marginTop: '1rem' }}>戻る</button>
        </div>
      </div>
    )
  }

  if (step === 'selection') {
    return (
      <div className="liff-container">
        <header className="header">
          <h1>メンバー確認</h1>
          <p>出欠を出すメンバーを選んでください</p>
        </header>
        <div className="member-list">
          {linkedMembers.map(m => (
            <div 
              key={m.id} 
              className={`member-item ${selectedForAttendance.includes(m.id) ? 'selected' : ''}`}
              style={{ position: 'relative' }}
              onClick={() => {
                if (selectedForAttendance.includes(m.id)) {
                  setSelectedForAttendance(selectedForAttendance.filter(id => id !== m.id))
                } else {
                  setSelectedForAttendance([...selectedForAttendance, m.id])
                }
              }}
            >
              <div className="member-info">
                <span className="member-name">{m.name} {selectedForAttendance.includes(m.id) ? '✅' : ''}</span>
                <span className="member-detail">
                  {m.role === 'player' ? `${m.grade}年 / ${getCategory(m.grade) === 'regular' ? 'レギュラー' : 'ジュニア'}` : 
                   m.role === 'coach' ? '指導者' : '保護者'}
                </span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleUnlink(m.id); }}
                style={{ background: 'none', border: 'none', color: '#ff4d4d', fontSize: '0.75rem', textDecoration: 'underline' }}
              >
                連携解除
              </button>
            </div>
          ))}
          <div 
            className="member-item" 
            style={{ border: '2px dashed #ddd', background: '#fcfcfc', justifyContent: 'center' }}
            onClick={() => setStep('linkage')}
          >
            <span style={{ color: '#666' }}>＋ 別のメンバーを追加連携</span>
          </div>
        </div>
        <button 
          className="btn-submit" 
          disabled={selectedForAttendance.length === 0}
          onClick={() => setStep('schedule_list')}
        >
          次へ（予定選択）
        </button>
      </div>
    )
  }

  const formatLiffDate = (date: any) => {
    if (!date) return '未設定';
    try {
      const d = date && typeof date.seconds === 'number' ? new Date(date.seconds * 1000) : new Date(date);
      const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
      return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}(${week})`;
    } catch (e) {
      return '日付エラー';
    }
  };

  const getAttendanceSummary = (scheduleId: string) => {
    const relevant = attendance.filter(a => a.schedule_id === scheduleId);
    const attending = relevant.filter(a => a.status === '出席' || a.status === '遅刻' || a.status === '早退');
    
    // Map IDs to names using allMembers
    const attendeeNames = attending.map(a => {
      const m = allMembers.find(mem => mem.id === a.user_id);
      return m ? m.name : 'Unknown';
    });
    
    // Check if current user (any of selectedForAttendance) has answered
    const userAnswered = relevant.some(a => selectedForAttendance.includes(a.user_id));
    
    return { count: attending.length, names: attendeeNames, answered: userAnswered };
  };

  if (step === 'schedule_list') {
    return (
      <div className="liff-container">
        <header className="header">
          <h1>予定を選択</h1>
          <p>出欠を回答するチーム予定を選んでください</p>
        </header>
        
        <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', borderBottom: '1px solid #eee' }}>
          {[
            { id: 'team', label: '⚾チーム', icon: '⚾' },
            { id: 'school', label: '🏫学校行事', icon: '🏫' },
            { id: 'ground', label: '🏟球場確保', icon: '🏟' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              style={{ 
                flex: 1, padding: '0.6rem 0', background: 'none', border: 'none', borderBottom: activeCategory === tab.id ? '3px solid var(--primary)' : 'none',
                color: activeCategory === tab.id ? 'var(--primary)' : '#888', fontSize: '0.8rem', fontWeight: activeCategory === tab.id ? 700 : 400,
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { id: 'recent', label: '直近(1.5週)' },
            { id: 'month', label: '1ヶ月先' },
            { id: 'past', label: '過去分' }
          ].map(range => (
            <button 
              key={range.id}
              onClick={() => setFilterRange(range.id as any)}
              style={{ 
                flex: 1, padding: '0.4rem', borderRadius: '20px', border: 'none',
                background: filterRange === range.id ? 'var(--primary)' : '#f1f3f5',
                color: filterRange === range.id ? 'white' : '#666',
                fontSize: '0.7rem', fontWeight: 700
              }}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="schedule-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {schedules
            .filter(s => {
              if (activeCategory === 'school') return s.type === '学校行事';
              if (activeCategory === 'ground') return s.type === '球場確保';
              return s.type !== '学校行事' && s.type !== '球場確保';
            })
            .filter(s => {
              const d = s.date && typeof s.date.seconds === 'number' ? new Date(s.date.seconds * 1000) : new Date(s.date);
              const now = new Date();
              now.setHours(0,0,0,0);
              
              if (filterRange === 'recent') {
                const limit = new Date(now.getTime() + (10.5 * 24 * 60 * 60 * 1000));
                return d >= now && d <= limit;
              }
              if (filterRange === 'month') {
                const limit = new Date(now.getTime() + (31 * 24 * 60 * 60 * 1000));
                return d >= now && d <= limit;
              }
              if (filterRange === 'past') {
                return d < now;
              }
              return true;
            })
            .sort((a, b) => {
              const da = a.date && typeof a.date.seconds === 'number' ? a.date.seconds : new Date(a.date).getTime();
              const db = b.date && typeof b.date.seconds === 'number' ? b.date.seconds : new Date(b.date).getTime();
              return filterRange === 'past' ? db - da : da - db;
            })
            .map(s => {
              const summary = getAttendanceSummary(s.id);
              const isTarget = s.target_categories?.includes('all') || 
                               selectedForAttendance.some(id => s.target_categories?.includes(getCategory(linkedMembers.find(m => m.id === id)?.grade)));
              const isInfoOnly = s.type === '学校行事' || s.type === '球場確保';
              
              return (
                <div 
                  key={s.id} 
                  className={`schedule-card ${summary.answered ? 'answered' : ''}`}
                  style={{ 
                    borderLeft: isInfoOnly ? `5px solid ${s.type === '学校行事' ? '#f4a261' : '#2a9d8f'}` : (isTarget ? '5px solid var(--primary)' : '1px solid #ddd'),
                    opacity: (isTarget || isInfoOnly) ? 1 : 0.7,
                    background: summary.answered ? '#f0fff4' : (isInfoOnly ? '#f8f9fa' : '#fff'),
                    cursor: isInfoOnly ? 'default' : 'pointer'
                  }}
                  onClick={() => {
                    if (isInfoOnly) return;
                    setSelectedScheduleId(s.id);
                    const existing = attendance.find(a => a.schedule_id === s.id && selectedForAttendance.includes(a.user_id));
                    if (existing) {
                      setStatus(existing.status);
                      setCarMode(existing.car_info?.mode || '');
                      setRemarks(existing.remarks || '');
                    } else {
                      setStatus('');
                      setCarMode('');
                      setRemarks('');
                    }
                    setStep('form');
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: isInfoOnly ? '#333' : 'var(--primary)', fontSize: '1rem' }}>{formatLiffDate(s.date)}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: s.type === '試合' ? '#e63946' : '#e9ecef', color: s.type === '試合' ? 'white' : '#333', fontWeight: 700 }}>
                        {s.type}
                      </span>
                      {!isInfoOnly && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: '#f8f9fa', border: '1px solid #dee2e6' }}>
                          {s.target_categories?.join(', ') || '全員'}
                        </span>
                      )}
                    </div>
                  </div>
                  {s.tournament_name && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#457b9d', margin: '0.3rem 0' }}>🏆 {s.tournament_name}</div>
                  )}
                  <div style={{ fontWeight: 700, margin: '0.3rem 0', fontSize: '0.95rem' }}>📍 {s.location}</div>
                  {s.meeting_time && (
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>⏰ {isInfoOnly ? '時間' : '集合'}: {s.meeting_time}</div>
                  )}
                  {s.has_lunch && (
                    <div style={{ fontSize: '0.8rem', color: '#e63946', fontWeight: 700, marginTop: '0.3rem' }}>
                      🍱 弁当が必要です
                    </div>
                  )}
                  {s.description && (
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.4rem', fontStyle: 'italic', borderTop: '1px solid #eee', paddingTop: '0.4rem' }}>
                      {s.description}
                    </div>
                  )}
                  {!isInfoOnly && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                        👥 出席: <strong>{summary.count}</strong> 名
                      </span>
                      {summary.answered && <span style={{ fontSize: '0.75rem', color: '#2ecc71', fontWeight: 700 }}>回答済 ✅</span>}
                    </div>
                  )}
                  {!isInfoOnly && summary.names.length > 0 && (
                    <div className="attendee-names">
                      出席: {summary.names.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
        
        <button className="btn-secondary" onClick={() => setStep('selection')} style={{ marginTop: '2rem' }}>＜ メンバー選択に戻る</button>
      </div>
    );
  }

  const currentSchedule = schedules.find(s => s.id === selectedScheduleId);
  if (!currentSchedule) return null;

  return (
    <div className="liff-container">
      <div className="step-indicator">
        <div className="step-dot"></div>
        <div className="step-dot"></div>
        <div className="step-dot active"></div>
      </div>
      
      <header className="header" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>出欠回答</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          対象: {selectedForAttendance.map(id => {
            const m = linkedMembers.find(m => m.id === id);
            return m ? `${m.name}(${getCategory(m.grade) === 'regular' ? 'レ' : 'ジ'})` : '';
          }).join(', ')}
        </p>
      </header>

      <div className={`schedule-card highlight`} style={{ borderLeft: `5px solid var(--primary)` }}>
        <div className="schedule-header">
          <span className="schedule-date">{formatLiffDate(currentSchedule.date)}</span>
          <span className="schedule-badge">
            {currentSchedule.target_categories?.join(', ') || '全員'}
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0.5rem 0' }}>📍 {currentSchedule.location}</div>
        {currentSchedule.tournament_name && (
          <div style={{ fontWeight: 700, color: '#457b9d', marginBottom: '0.5rem' }}>🏆 {currentSchedule.tournament_name}</div>
        )}
        {currentSchedule.meeting_time && (
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>⏰ 集合: {currentSchedule.meeting_time}</div>
        )}
        {currentSchedule.has_lunch && (
          <div style={{ color: '#e63946', fontWeight: 700, marginBottom: '0.5rem' }}>🍱 弁当が必要です</div>
        )}
        {(currentSchedule.description || currentSchedule.ai_change_comment) && (
          <div style={{ fontSize: '0.75rem', background: '#f8f9fa', padding: '0.7rem', borderRadius: '8px', color: '#555', border: '1px solid #eee' }}>
            {currentSchedule.description && <div style={{ marginBottom: currentSchedule.ai_change_comment ? '0.5rem' : 0 }}>📝 備考: {currentSchedule.description}</div>}
            {currentSchedule.ai_change_comment && <div>✨ AI要約: {currentSchedule.ai_change_comment}</div>}
          </div>
        )}
        
        {/* Attendance Summary in Detail View */}
        {(() => {
          const summary = getAttendanceSummary(currentSchedule.id);
          return summary.count > 0 ? (
            <div style={{ marginTop: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#f8f9fa', padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, borderBottom: '1px solid #e0e0e0' }}>
                👥 出席状況 ({summary.count}名)
              </div>
              <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>
                {summary.names.join(', ')}
              </div>
            </div>
          ) : null;
        })()}
      </div>

      <div className="form-group" style={{ marginTop: '1.5rem' }}>
        <label className="label">コンディション</label>
        <div className="options-grid">
          {['出席', '欠席', '遅刻', '早退'].map(s => (
            <div 
              key={s}
              className={`option-card ${status === s ? 'selected' : ''}`}
              onClick={() => setStatus(s as any)}
            >
              {s === '出席' ? '⚾' : s === '欠席' ? '🏠' : s === '遅刻' ? '🏃' : '👋'} {s}
            </div>
          ))}
        </div>
      </div>

      {status !== '欠席' && (
        <div className="form-group">
          <label className="label">配車</label>
          <div className="options-grid" style={{ gridTemplateColumns: '1fr' }}>
            {['車出し可能', '同乗希望', '不要'].map(m => (
              <div 
                key={m}
                className={`option-card ${carMode === m ? 'selected' : ''}`}
                onClick={() => setCarMode(m as any)}
                style={{ textAlign: 'left', paddingLeft: '1.5rem' }}
              >
                {m === '車出し可能' ? '🚐 車出しできます' : m === '同乗希望' ? '🙋 同乗希望です' : '🚲 送迎不要・自力'}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="label">伝言（備考）</label>
        <textarea 
          style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '2px solid #edf2f4', outline: 'none' }}
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="コーチへのメッセージがあれば"
        />
      </div>

      <button 
        className="btn-submit" 
        disabled={!status || (status !== '欠席' && !carMode) || submitting}
        onClick={handleSubmit}
      >
        {submitting ? '送信中...' : '登録を完了する！'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button 
          onClick={() => setStep('schedule_list')}
          style={{ background: 'none', color: 'var(--text-dim)', fontSize: '0.85rem' }}
        >
          ＜ 予定一覧に戻る
        </button>
      </div>
    </div>
  )
}

export default App;
