import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import AttendanceSummary from './components/AttendanceSummary'
import AttendanceTable from './components/AttendanceTable'
import LogViewer from './components/LogViewer'
import MemberManager from './components/MemberManager'
import ScheduleManager from './components/ScheduleManager'
import CarManager from './components/CarManager'
import GroundManager from './components/GroundManager'
import BroadcastManager from './components/BroadcastManager'
import { db } from './firebase'
import './index.css'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [records, setRecords] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "attendance"))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: any[] = []
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() })
      })
      setRecords(data)
      setLoading(false)
    }, (error) => {
      console.error("Firestore listen error:", error)
      setLoading(false)
    })

    // Also listen to members and schedules
    const unsubMembers = onSnapshot(collection(db, "members"), (snapshot) => {
      const data: any[] = []
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }))
      setMembers(data)
    })

    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snapshot) => {
      const data: any[] = []
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }))
      setSchedules(data)
    })

    return () => {
      unsubscribe()
      unsubMembers()
      unsubSchedules()
    }
  }, [])

  const presentCount = records.filter(r => r.status === '出席').length
  const absentCount = records.filter(r => r.status === '欠席').length
  const wantRideCount = records.filter(r => r.car_info?.mode === '同乗希望').length
  const seatsAvailable = records.filter(r => r.car_info?.mode === '車出し可能').reduce((acc, r) => acc + (r.car_info?.seats || 3), 0)
  const carpoolShortage = Math.max(0, wantRideCount - seatsAvailable)

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <>
            <AttendanceSummary 
              present={presentCount} 
              absent={absentCount} 
              total={records.length} 
              carpoolShortage={carpoolShortage}
            />
            <AttendanceTable records={records} members={members} schedules={schedules} />
            <LogViewer members={members} />
          </>
        )
      case 'members':
        return <MemberManager />
      case 'schedules':
        return <ScheduleManager />
      case 'cars':
        return <CarManager />
      case 'grounds':
        return <GroundManager />
      case 'broadcast':
        return <BroadcastManager />
      default:
        return null
    }
  }

  const [syncing, setSyncing] = useState(false)

  const handleSyncSheets = async () => {
    setSyncing(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sync_all_sheets`)
      if (response.ok) {
        alert("スプレッドシートの同期が完了しました！")
      } else {
        alert("同期に失敗しました")
      }
    } catch (err) {
      alert("通信エラーが発生しました")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo">LITTLE EAGLES / 管理画面</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            className="btn-sync" 
            onClick={handleSyncSheets} 
            disabled={syncing}
            style={{ 
              background: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              padding: '0.4rem 0.8rem', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {syncing ? '⌛ 同期中...' : '📊 Sheets同期'}
          </button>
          <div className="card" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', margin: 0 }}>
            {loading ? '接続中...' : 'Live 🟢'}
          </div>
        </div>
      </header>

      <nav className="nav-tabs">
        <div className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>🏠 ホーム</div>
        <div className={`nav-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>👥 メンバー</div>
        <div className={`nav-tab ${activeTab === 'schedules' ? 'active' : ''}`} onClick={() => setActiveTab('schedules')}>📅 予定</div>
        <div className={`nav-tab ${activeTab === 'grounds' ? 'active' : ''}`} onClick={() => setActiveTab('grounds')}>🏟️ 球場確保</div>
        <div className={`nav-tab ${activeTab === 'cars' ? 'active' : ''}`} onClick={() => setActiveTab('cars')}>🚗 車両</div>
        <div className={`nav-tab ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')}>📢 お知らせ</div>
      </nav>

      <main>
        {renderContent()}
      </main>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: '#a0a0a5', fontSize: '0.8rem' }}>
        &copy; 2026 Little Eagles Baseball Team - スコア・アシスタント AI
      </footer>
    </div>
  )
}

export default App
