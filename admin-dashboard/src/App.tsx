import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import AttendanceSummary from './components/AttendanceSummary'
import AttendanceTable from './components/AttendanceTable'
import './index.css'

function App() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Real-time synchronization with Firestore
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

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo">LITTLE EAGLES / ADMIN</div>
        <div className="card" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
          Real-time: {loading ? 'Connecting...' : 'Live 🟢'}
        </div>
      </header>

      <main>
        <AttendanceSummary 
          present={presentCount} 
          absent={absentCount} 
          total={records.length} 
          carpoolShortage={carpoolShortage}
        />
        
        <AttendanceTable records={records} />
      </main>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: '#a0a0a5', fontSize: '0.8rem' }}>
        &copy; 2026 Little Eagles Baseball Team - Score Assistant AI
      </footer>
    </div>
  )
}

export default App
