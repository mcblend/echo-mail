import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getRecordings, getProfile, deleteRecording } from '../lib/supabase'
import RecordingCard from '../components/RecordingCard'
import { MicIcon } from '../components/MicIcon'

export default function Recordings() {
  const navigate = useNavigate()
  const [recordings, setRecordings] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      setUserId(uid)
      const [recs, prof] = await Promise.all([
        getRecordings(uid).catch(() => []),
        getProfile(uid).catch(() => null),
      ])
      setRecordings(recs)
      setProfile(prof)
      setLoading(false)
    })
  }, [])

  const handleDelete = async (id) => {
    try {
      await deleteRecording(id, userId)
      setRecordings(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Unknown error'))
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1e2d40' }}>
        <div onClick={() => navigate('/')} style={{ width: 44, height: 44, background: '#1a2332', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ab0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#e2eaf4', letterSpacing: '-0.3px' }}>Recordings</span>
        <div onClick={() => navigate('/settings')} style={{ width: 44, height: 44, background: '#1a2332', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ab0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0-4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, border: '2px solid #1e2d40', borderTopColor: '#7ab0e0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : recordings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MicIcon size={28} color="#7ab0e0" strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontSize: 16, color: '#4a6a8a' }}>No recordings yet</div>
            <div style={{ fontSize: 14, color: '#2a4a6a', marginTop: 8 }}>Tap the mic on the home screen to start</div>
          </div>
        ) : (
          recordings.map(r => (
            <RecordingCard
              key={r.id}
              recording={r}
              onDelete={handleDelete}
              confirmDelete={profile?.confirm_before_delete ?? false}
            />
          ))
        )}
      </div>
    </div>
  )
}
