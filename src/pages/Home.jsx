import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getProfile, upsertProfile, uploadAudio, insertRecording } from '../lib/supabase'
import { LiveWaveform } from '../components/Waveform'

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const SUPPORTED_MIME = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
function getSupportedMime() {
  return SUPPORTED_MIME.find(m => MediaRecorder.isTypeSupported(m)) || 'audio/webm'
}

export default function Home() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [status, setStatus] = useState('idle') // idle | saving | done | error
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const wakeLockRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      setSession(data.session)
      const uid = data.session.user.id
      try {
        const p = await getProfile(uid)
        setProfile(p)
        if (p?.auto_start_recording) startRecording()
      } catch {
        // Profile may not have been created by trigger — create it now
        try {
          const p = await upsertProfile(uid, {})
          setProfile(p)
        } catch { /* will work without profile */ }
      }
    })
  }, [])

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator && profile?.keep_screen_awake !== false) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      } catch { /* not critical */ }
    }
  }

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  const startTimer = () => {
    startTimeRef.current = Date.now()
    setElapsed(0)
    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(sec)

      // Auto-stop at max recording length
      if (profile?.max_recording_length && sec >= profile.max_recording_length * 60) {
        stopAndSend()
      }
    }, 1000)
  }

  const stopTimer = () => {
    clearInterval(timerRef.current)
    timerRef.current = null
  }

  const startRecording = async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = getSupportedMime()
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(250) // collect chunks every 250ms
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      startTimer()
      await requestWakeLock()
    } catch (err) {
      setErrorMsg('Microphone access denied. Please allow microphone access and try again.')
    }
  }

  const stopAndSend = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    stopTimer()
    releaseWakeLock()
    setIsRecording(false)

    const duration = elapsed || Math.floor((Date.now() - startTimeRef.current) / 1000)
    setStatus('saving')

    // Collect remaining data then stop
    await new Promise(resolve => {
      mediaRecorderRef.current.addEventListener('stop', resolve, { once: true })
      mediaRecorderRef.current.stop()
    })

    const mime = getSupportedMime()
    const ext = mime.includes('ogg') ? 'ogg' : 'webm'
    const blob = new Blob(chunksRef.current, { type: mime })
    const now = new Date()
    const title = `Voice Memo — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    const filename = `${Date.now()}.${ext}`

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { path, publicUrl } = await uploadAudio(user.id, blob, filename)

      const appUrl = import.meta.env.VITE_PLAYBACK_URL || import.meta.env.VITE_APP_URL || window.location.origin
      const recording = await insertRecording({
        user_id: user.id,
        title,
        duration,
        storage_path: path,
        public_url: publicUrl,
        sent_to_email: profile?.destination_email || null,
      })

      const playbackUrl = `${appUrl}/playback/${recording.id}`

      if (profile?.destination_email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: profile.destination_email,
            title,
            duration,
            playbackUrl,
            recordingId: recording.id,
          }),
        })
      }

      setStatus('done')
      setElapsed(0)
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to save recording: ' + (err.message || 'Unknown error'))
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }, [elapsed, profile])

  const handleMicTap = () => {
    if (isRecording) {
      stopAndSend()
    } else {
      startRecording()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1e2d40' }}>
        <div onClick={() => navigate('/recordings')} style={{ width: 44, height: 44, background: '#1a2332', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ab0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </div>

        <span style={{ fontSize: 18, fontWeight: 700, color: '#e2eaf4', letterSpacing: '-0.3px' }}>Echo Mail</span>

        <div onClick={() => navigate('/settings')} style={{ width: 44, height: 44, background: '#1a2332', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ab0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

        {/* Status / error messages */}
        {status === 'saving' && (
          <div style={{ background: '#1a2332', border: '1px solid #1e2d40', borderRadius: 10, padding: '12px 20px', marginBottom: 32, fontSize: 14, color: '#7ab0e0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 14, height: 14, border: '2px solid #1e2d40', borderTopColor: '#7ab0e0', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Saving and sending…
          </div>
        )}
        {status === 'done' && (
          <div style={{ background: '#0d2b1a', border: '1px solid #1a4a2a', borderRadius: 10, padding: '12px 20px', marginBottom: 32, fontSize: 14, color: '#4ade80' }}>
            ✓ Recording saved and email sent
          </div>
        )}
        {(status === 'error' || errorMsg) && (
          <div style={{ background: '#2a1a1a', border: '1px solid #c0392b', borderRadius: 10, padding: '12px 20px', marginBottom: 32, fontSize: 14, color: '#e07070', maxWidth: 320, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {/* No email warning */}
        {!profile?.destination_email && status === 'idle' && !errorMsg && (
          <div
            onClick={() => navigate('/settings')}
            style={{ background: '#1a1a2a', border: '1px solid #2a2a4a', borderRadius: 10, padding: '12px 20px', marginBottom: 32, fontSize: 13, color: '#4a6a8a', cursor: 'pointer', textAlign: 'center' }}
          >
            ⚠ No destination email set — tap to go to Settings
          </div>
        )}

        {/* Timer */}
        <div style={{ fontSize: 48, fontWeight: 200, color: isRecording ? '#c0392b' : '#1e2d40', fontVariantNumeric: 'tabular-nums', letterSpacing: 2, marginBottom: 16, transition: 'color 0.3s', minWidth: 130, textAlign: 'center' }}>
          {formatTimer(elapsed)}
        </div>

        {/* Waveform */}
        <div style={{ width: '100%', maxWidth: 280, marginBottom: 40 }}>
          <LiveWaveform active={isRecording} />
        </div>

        {/* Mic button with pulse rings */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          {isRecording && (
            <>
              <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: '#c0392b', opacity: 0.15, animation: 'pulse-ring 1.2s ease-out infinite' }} />
              <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: '#c0392b', opacity: 0.1, animation: 'pulse-ring2 1.2s ease-out 0.3s infinite' }} />
            </>
          )}
          <div
            onClick={handleMicTap}
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: isRecording ? '#c0392b' : '#1a2f47',
              border: `2px solid ${isRecording ? '#e05050' : '#1e2d40'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.3s, border-color 0.3s',
              position: 'relative',
              zIndex: 1,
              boxShadow: isRecording ? '0 0 0 4px rgba(192,57,43,0.2)' : 'none',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isRecording ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7ab0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </div>
        </div>

        {/* Label */}
        <p style={{ fontSize: 14, color: '#4a6a8a', textAlign: 'center', letterSpacing: 0.2 }}>
          {isRecording ? 'Recording… tap to stop and send' : 'Tap to start recording'}
        </p>
      </div>
    </div>
  )
}
