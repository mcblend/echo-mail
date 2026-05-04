import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getRecordingById } from '../lib/supabase'
import { StaticWaveform } from '../components/Waveform'
import { MicIcon } from '../components/MicIcon'

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

export default function Playback() {
  const { id } = useParams()
  const [recording, setRecording] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    getRecordingById(id)
      .then(r => {
        setRecording(r)
        setLoading(false)
      })
      .catch(() => {
        setError('Recording not found or no longer available.')
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!recording) return
    const audio = new Audio(recording.public_url)
    audioRef.current = audio

    // WebM audio often doesn't expose duration until fully buffered.
    // Use the stored DB duration as a reliable fallback.
    const getDur = () => (isFinite(audio.duration) && audio.duration > 0)
      ? audio.duration
      : recording.duration

    audio.addEventListener('timeupdate', () => {
      const dur = getDur()
      setCurrentTime(audio.currentTime)
      setProgress(dur ? audio.currentTime / dur : 0)
    })
    audio.addEventListener('durationchange', () => {
      // Re-compute progress when duration finally resolves
      const dur = getDur()
      setProgress(dur ? audio.currentTime / dur : 0)
    })
    audio.addEventListener('ended', () => {
      setPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [recording])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  const handleSeek = (ratio) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = ratio * audio.duration
    setProgress(ratio)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #1e2d40', borderTopColor: '#7ab0e0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MicIcon size={28} color="#7ab0e0" strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: 18, color: '#e2eaf4', marginBottom: 8 }}>Recording unavailable</div>
          <div style={{ fontSize: 14, color: '#4a6a8a' }}>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MicIcon size={24} color="#7ab0e0" strokeWidth={2} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Echo Mail</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e2eaf4', letterSpacing: '-0.3px', margin: '0 0 8px' }}>{recording.title}</h1>
        <div style={{ fontSize: 13, color: '#4a6a8a' }}>{formatDate(recording.created_at)}</div>
        {recording.sent_to_email && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#4a6a8a' }}>Sent to {recording.sent_to_email}</div>
        )}
      </div>

      {/* Player card */}
      <div style={{ width: '100%', maxWidth: 480, background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '28px 24px' }}>
        {/* Waveform */}
        <div style={{ marginBottom: 20 }}>
          <StaticWaveform progress={progress} onSeek={handleSeek} />
        </div>

        {/* Time display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: '#4a6a8a', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(currentTime)}</span>
          <span style={{ fontSize: 13, color: '#4a6a8a', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(recording.duration)}</span>
        </div>

        {/* Play button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            onClick={togglePlay}
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: '#1a2f47',
              border: '2px solid #1e2d40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {playing ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#7ab0e0">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#7ab0e0">
                <polygon points="6,3 20,12 6,21" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, fontSize: 12, color: '#2a3a4a', textAlign: 'center' }}>
        Powered by Echo Mail
      </div>
    </div>
  )
}
