import { useEffect, useRef } from 'react'

const BAR_COUNT = 28

// Live recording waveform — animated random bars in red
export function LiveWaveform({ active }) {
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => i)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 40, padding: '0 4px' }}>
      {bars.map(i => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: active ? '#c0392b' : '#1e2d40',
            height: active ? undefined : 4,
            minHeight: 4,
            maxHeight: 36,
            animation: active
              ? `wave-bar ${0.4 + (i % 7) * 0.08}s ease-in-out ${(i % 5) * 0.05}s infinite alternate`
              : 'none',
            '--peak': `${8 + (i % 6) * 5}px`,
            flex: 1,
          }}
        />
      ))}
    </div>
  )
}

// Static playback waveform visualization
export function StaticWaveform({ progress = 0, onSeek }) {
  const containerRef = useRef(null)

  const heights = [
    6, 14, 22, 18, 8, 26, 30, 24, 12, 20, 28, 16, 10, 24, 32, 28, 20, 14, 24, 18, 10, 26, 22, 16, 12, 20, 8, 14,
    24, 18, 30, 22, 16, 28, 12, 20, 26, 10, 18, 24, 14, 28, 20, 16, 22, 8, 26, 18, 12, 24, 30, 20
  ]

  const handleClick = (e) => {
    if (!onSeek) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(ratio)
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{ display: 'flex', alignItems: 'center', gap: 2, height: 44, cursor: onSeek ? 'pointer' : 'default', padding: '0 2px' }}
    >
      {heights.map((h, i) => {
        const ratio = i / heights.length
        const played = ratio < progress
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: h,
              borderRadius: 2,
              background: played ? '#7ab0e0' : '#1e2d40',
              transition: 'background 0.1s',
            }}
          />
        )
      })}
    </div>
  )
}
