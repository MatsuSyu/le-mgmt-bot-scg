import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import AttendanceSummary from './components/AttendanceSummary'
import AttendanceTable from './components/AttendanceTable'
import LogViewer from './components/LogViewer'
import MemberManager from './components/MemberManager'
import ScheduleManager from './components/ScheduleManager'
import CarManager from './components/CarManager'
import { db } from './firebase'
import './index.css'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [records, setRecords] = useState<any[]>([])
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

    return () => unsubscribe()
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
            <AttendanceTable records={records} />
            <LogViewer />
          </>
        )
      case 'members':
        return <MemberManager />
      case 'schedules':
        return <ScheduleManager />
      case 'cars':
        return <CarManager />
      default:
        return null
    }
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo">LITTLE EAGLES / 管理画面</div>
        <div className="card" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', margin: 0 }}>
          {loading ? '接続中...' : 'Live 🟢'}
        </div>
      </header>

      <nav className="nav-tabs">
        <div className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>🏠 ホーム</div>
        <div className={`nav-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>👥 メンバー</div>
        <div className={`nav-tab ${activeTab === 'schedules' ? 'active' : ''}`} onClick={() => setActiveTab('schedules')}>📅 予定</div>
        <div className={`nav-tab ${activeTab === 'cars' ? 'active' : ''}`} onClick={() => setActiveTab('cars')}>🚗 車両</div>
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
