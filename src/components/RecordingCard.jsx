import { useState, useRef, useEffect } from 'react'
import { StaticWaveform } from './Waveform'

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RecordingCard({ recording, onDelete, confirmDelete }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio(recording.public_url)
    audioRef.current = audio

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
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
  }, [recording.public_url])

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

  const handleDelete = () => {
    if (confirmDelete) {
      if (!window.confirm(`Delete "${recording.title}"?`)) return
    }
    onDelete(recording.id)
  }

  return (
    <div style={{ background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '20px', marginBottom: 12, animation: 'fade-in 0.2s ease' }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e2eaf4', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {recording.title}
          </div>
          <div style={{ fontSize: 12, color: '#4a6a8a' }}>
            {formatDate(recording.created_at)} · {formatDuration(recording.duration)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
          {/* Sent badge */}
          {recording.sent_to_email && (
            <div style={{ background: '#0d2b1a', border: '1px solid #1a4a2a', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#4ade80', fontWeight: 600, whiteSpace: 'nowrap' }}>
              ✓ Sent
            </div>
          )}
          {/* Delete */}
          <div
            onClick={handleDelete}
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a6a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <StaticWaveform progress={progress} onSeek={handleSeek} />

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
        {/* Play/pause */}
        <div
          onClick={togglePlay}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#7ab0e0"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#7ab0e0"><polygon points="5,3 19,12 5,21" /></svg>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#4a6a8a', fontVariantNumeric: 'tabular-nums' }}>
          {formatDuration(currentTime)} / {formatDuration(recording.duration)}
        </span>
      </div>
    </div>
  )
}
