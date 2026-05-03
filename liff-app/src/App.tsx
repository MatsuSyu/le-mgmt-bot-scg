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
}

function App() {
  const [step, setStep] = useState<'loading' | 'linkage' | 'selection' | 'form' | 'submitted'>('loading')
  const [userId, setUserId] = useState<string>('')
  const [linkedMembers, setLinkedMembers] = useState<Member[]>([])
  const [unlinkedMembers, setUnlinkedMembers] = useState<Member[]>([])
  const [selectedForAttendance, setSelectedForAttendance] = useState<string[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  
  const [status, setStatus] = useState<'出席' | '欠席' | '遅刻' | '早退' | ''>('')
  const [carMode, setCarMode] = useState<'車出し可能' | '同乗希望' | '不要' | ''>('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const SUBMIT_API = import.meta.env.VITE_API_URL;
  const SCHEDULE_API = import.meta.env.VITE_SCHEDULE_API_URL;
  const MEMBER_API = import.meta.env.VITE_MEMBER_API_URL;

  useEffect(() => {
    const init = async () => {
      try {
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
        let lineId = 'test_user_123'
        if (liff.isLoggedIn()) {
          lineId = liff.getContext()?.userId || ''
        }
        setUserId(lineId)

        // 1. Check Linkage
        const linkRes = await fetch(`${MEMBER_API}?line_user_id=${lineId}`)
        if (linkRes.ok) {
          const members = await linkRes.json()
          const linked = members.filter((m: any) => m.line_user_id === lineId)
          if (linked.length > 0) {
            setLinkedMembers(linked)
            setSelectedForAttendance(linked.map((m: any) => m.id))
            setStep('selection')
          } else {
            const unlinkedRes = await fetch(MEMBER_API)
            const unlinked = await unlinkedRes.json()
            setUnlinkedMembers(unlinked)
            setStep('linkage')
          }
        }

        // Fetch schedules
        const schedRes = await fetch(SCHEDULE_API)
        if (schedRes.ok) {
          const data = await schedRes.json()
          setSchedules(data)
        }
      } catch (err) {
        console.error("Init failed", err)
        setStep('form') // Fallback
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
      window.location.reload()
    } catch (err) {
      alert("連携に失敗しました")
    }
  }

  const handleSubmit = async () => {
    if (!status || !carMode || selectedForAttendance.length === 0) return;
    setSubmitting(true);
    try {
      const response = await fetch(SUBMIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: selectedForAttendance,
          schedule_id: schedules[0]?.id,
          status: status,
          car_info: { mode: carMode },
          remarks: remarks
        })
      });
      if (response.ok) {
        setStep('submitted');
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
          onClick={() => setStep('selection')}
          style={{ background: '#f1f3f5', color: '#333' }}
        >
          回答を修正する
        </button>
        <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#8d99ae' }}>
          ※この画面は閉じて構いません
        </p>
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
          {unlinkedMembers.length === 0 && <p className="empty-state">未連携のメンバーがいません。管理者に連絡してください。</p>}
        </div>
      </div>
    )
  }

  if (step === 'selection') {
    return (
      <div className="liff-container">
        <header className="header">
          <h1>回答対象の選択</h1>
          <p>出欠を出すメンバーを選んでください（複数可）</p>
        </header>
        <div className="member-list">
          {linkedMembers.map(m => (
            <div 
              key={m.id} 
              className={`member-item ${selectedForAttendance.includes(m.id) ? 'selected' : ''}`}
              onClick={() => {
                if (selectedForAttendance.includes(m.id)) {
                  setSelectedForAttendance(selectedForAttendance.filter(id => id !== m.id))
                } else {
                  setSelectedForAttendance([...selectedForAttendance, m.id])
                }
              }}
            >
              <div className="member-info">
                <span className="member-name">{m.name}</span>
                <span className="member-detail">
                  {m.role === 'player' ? '選手' : 
                   m.role === 'coach' ? '指導者' : 
                   m.role === 'parent' ? '保護者' : 
                   m.role === 'coach_parent' ? '指導者/保護者' : m.role}
                </span>
              </div>
              {selectedForAttendance.includes(m.id) ? '✅' : '○'}
            </div>
          ))}
        </div>
        <button 
          className="btn-submit" 
          disabled={selectedForAttendance.length === 0}
          onClick={() => setStep('form')}
        >
          次へ（回答入力）
        </button>
      </div>
    )
  }

  const formatLiffDate = (date: any) => {
    if (!date) return '未設定';
    try {
      if (date && typeof date.seconds === 'number') {
        return new Date(date.seconds * 1000).toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' });
      }
      if (date instanceof Date) {
        return date.toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' });
      }
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' });
      }
      return String(date);
    } catch (e) {
      return '日付エラー';
    }
  };

  return (
    <div className="liff-container">
      <div className="step-indicator">
        <div className="step-dot"></div>
        <div className="step-dot active"></div>
      </div>
      
      <header className="header" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>出欠回答</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          対象: {selectedForAttendance.map(id => linkedMembers.find(m => m.id === id)?.name).join(', ')}
        </p>
      </header>

      {schedules[0] && (
        <div className="schedule-card">
          <div className="schedule-header">
            <span className="schedule-date">{formatLiffDate(schedules[0].date)}</span>
            <span className="schedule-badge">{schedules[0].type}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0.5rem 0' }}>{schedules[0].location}</div>
          {schedules[0].ai_change_comment && (
            <div style={{ fontSize: '0.75rem', background: '#fffbe6', padding: '0.5rem', borderRadius: '8px', color: '#856404' }}>
              ✨ AI要約: {schedules[0].ai_change_comment}
            </div>
          )}
        </div>
      )}

      <div className="form-group">
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
        disabled={!status || !carMode || submitting}
        onClick={handleSubmit}
      >
        {submitting ? '送信中...' : '登録を完了する！'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button 
          onClick={() => setStep('selection')}
          style={{ background: 'none', color: 'var(--text-dim)', fontSize: '0.85rem' }}
        >
          ＜ メンバー選択に戻る
        </button>
      </div>
    </div>
  )
}

export default App;
