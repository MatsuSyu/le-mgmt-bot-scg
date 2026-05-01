import { useState, useEffect } from 'react'
import liff from '@line/liff'
import './index.css'

function App() {
  const [status, setStatus] = useState<'出席' | '欠席' | ''>('')
  const [carMode, setCarMode] = useState<'車出し可能' | '同乗希望' | '不要' | ''>('')
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    liff.init({ liffId: "YOUR_LIFF_ID" })
      .then(() => {
        if (liff.isLoggedIn()) {
          const profile = liff.getContext();
          setUserId(profile?.userId || 'unknown_user');
        } else {
          // liff.login(); // In production, force login
          setUserId('test_user_id');
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("LIFF Init failed", err);
        setUserId('test_user_id_error');
        setLoading(false)
      });
  }, [])

  const handleSubmit = async () => {
    if (!status || !carMode) return;

    setSubmitting(true);
    try {
      const response = await fetch("https://your-firebase-region-project.cloudfunctions.net/submit_attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          schedule_id: "2024-05-12-practice", // Mock schedule
          status: status,
          car_info: { mode: carMode }
        })
      });

      if (response.ok) {
        alert("送信完了！ナイスプレイ！");
        liff.closeWindow();
      } else {
        alert("送信に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-overlay">Loading...</div>

  return (
    <div className="liff-container">
      <header className="header">
        <h1>LITTLE EAGLES</h1>
        <p>出欠・配車連絡フォーム</p>
      </header>

      <div className="form-group">
        <label className="label">今日のコンディション（出欠）</label>
        <div className="options-grid">
          <div 
            className={`option-card ${status === '出席' ? 'selected' : ''}`}
            onClick={() => setStatus('出席')}
          >
            ⚾ 出席
          </div>
          <div 
            className={`option-card ${status === '欠席' ? 'selected' : ''}`}
            onClick={() => setStatus('欠席')}
          >
            🏠 欠席
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="label">配車のプレイスタイル</label>
        <div className="options-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div 
            className={`option-card ${carMode === '車出し可能' ? 'selected' : ''}`}
            onClick={() => setCarMode('車出し可能')}
          >
            🚐 車出し可能です！
          </div>
          <div 
            className={`option-card ${carMode === '同乗希望' ? 'selected' : ''}`}
            onClick={() => setCarMode('同乗希望')}
          >
            🙋 同乗を希望します
          </div>
          <div 
            className={`option-card ${carMode === '不要' ? 'selected' : ''}`}
            onClick={() => setCarMode('不要')}
          >
            🚲 送迎不要・自力
          </div>
        </div>
      </div>

      <button 
        className="btn-submit" 
        disabled={!status || !carMode || submitting}
        onClick={handleSubmit}
      >
        {submitting ? '送信中...' : '出欠を登録する！'}
      </button>

      <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: '#8d99ae' }}>
        User: {userId}
      </p>
    </div>
  )
}

export default App
