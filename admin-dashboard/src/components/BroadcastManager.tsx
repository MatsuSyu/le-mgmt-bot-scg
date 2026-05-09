import React, { useState } from 'react';

const BroadcastManager: React.FC = () => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ status: string, sent_count?: number } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!window.confirm("このメッセージを全メンバーにLINE送信しますか？")) return;

    setSending(true);
    setResult(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/broadcast_message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      setResult(data);
      if (response.ok) {
        alert(`${data.sent_count} 名に送信しました！`);
        setMessage('');
      } else {
        alert("送信に失敗しました");
      }
    } catch (err) {
      console.error("Broadcast failed", err);
      alert("通信エラーが発生しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card">
      <h3>📢 一斉お知らせ（LINE通知）</h3>
      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>
        連携済みの全メンバーのLINEに対して、直接プッシュ通知を送信します。<br />
        重要なお知らせ（急な予定変更、緊急連絡など）に利用してください。
      </p>

      <div className="form-group">
        <label className="label">送信メッセージ</label>
        <textarea 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="例：【緊急】明日の練習は雨天のため中止となりました。各自、自主練をお願いします。"
          rows={5}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            borderRadius: '12px', 
            border: '2px solid #edf2f4',
            fontSize: '1rem',
            fontFamily: 'inherit'
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button 
          className="btn-primary" 
          onClick={handleSend} 
          disabled={sending || !message.trim()}
          style={{ 
            background: sending ? '#ccc' : '#00B900', 
            borderColor: '#00B900',
            padding: '0.8rem 2rem',
            fontSize: '1rem'
          }}
        >
          {sending ? '⌛ 送信中...' : '🚀 LINEで一斉送信'}
        </button>
      </div>

      {result && (
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          borderRadius: '8px', 
          background: result.status === 'success' ? '#f0fff4' : '#fff1f0',
          border: `1px solid ${result.status === 'success' ? '#c6f6d5' : '#ffa39e'}`,
          color: result.status === 'success' ? '#2f855a' : '#c53030',
          fontSize: '0.9rem'
        }}>
          {result.status === 'success' ? (
            <>✅ 送信完了: <strong>{result.sent_count}</strong> 名に届けました。</>
          ) : (
            <>❌ 送信エラーが発生しました。</>
          )}
        </div>
      )}
    </div>
  );
};

export default BroadcastManager;
