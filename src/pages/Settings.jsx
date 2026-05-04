import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getProfile, upsertProfile } from '../lib/supabase'

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        background: checked ? '#1a4a7a' : '#1a2332',
        border: `1px solid ${checked ? '#2a6aaa' : '#1e2d40'}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: checked ? 22 : 3,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: checked ? '#7ab0e0' : '#2a3a4a',
        transition: 'left 0.2s, background 0.2s',
      }} />
    </div>
  )
}

function Row({ label, sublabel, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #1e2d40' }}>
      <div>
        <div style={{ fontSize: 15, color: '#e2eaf4' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: '#4a6a8a', marginTop: 3 }}>{sublabel}</div>}
      </div>
      {right}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      setUserId(data.session.user.id)
      try {
        const p = await getProfile(data.session.user.id)
        setProfile(p)
        setEmail(p?.destination_email || '')
      } catch {
        setProfile({ confirm_before_delete: false, keep_screen_awake: true, max_recording_length: 5 })
      }
    })
  }, [])

  const update = async (patch) => {
    const merged = { ...profile, ...patch }
    setProfile(merged)
    try {
      await upsertProfile(userId, patch)
    } catch (err) {
      console.error('Settings save failed:', err)
    }
  }

  const saveEmail = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await upsertProfile(userId, { destination_email: email })
      setProfile(p => ({ ...p, destination_email: email }))
      setSaveMsg('Saved!')
    } catch (err) {
      setSaveMsg('Error: ' + (err.message || 'Could not save'))
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 2500)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1e2d40' }}>
        <div onClick={() => navigate(-1)} style={{ width: 44, height: 44, background: '#1a2332', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ab0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#e2eaf4', letterSpacing: '-0.3px' }}>Settings</span>
        <div style={{ width: 44 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto' }}>
        {/* Section: Email */}
        <div style={{ marginBottom: 8, fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Destination</div>
        <div style={{ background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '20px', marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#4a6a8a', marginBottom: 8 }}>Send recordings to</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', background: '#0d1117', border: '1px solid #1e2d40', borderRadius: 10, padding: '12px 14px', color: '#e2eaf4', fontSize: 16, outline: 'none', marginBottom: 12 }}
          />
          <div
            onClick={saveEmail}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '13px',
              background: '#1a2f47',
              color: '#7ab0e0',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              userSelect: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            {saving ? 'Saving…' : saveMsg || 'Save email address'}
          </div>
        </div>

        {/* Section: Preferences */}
        <div style={{ marginBottom: 8, fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Preferences</div>
        <div style={{ background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '0 20px', marginBottom: 24 }}>
          <Row
            label="Confirm before delete"
            sublabel="Show a confirmation prompt when deleting"
            right={
              <Toggle
                checked={profile?.confirm_before_delete ?? false}
                onChange={v => update({ confirm_before_delete: v })}
              />
            }
          />
          <Row
            label="Keep screen awake"
            sublabel="Prevent sleep while recording"
            right={
              <Toggle
                checked={profile?.keep_screen_awake ?? true}
                onChange={v => update({ keep_screen_awake: v })}
              />
            }
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
            <div>
              <div style={{ fontSize: 15, color: '#e2eaf4' }}>Max recording length</div>
              <div style={{ fontSize: 12, color: '#4a6a8a', marginTop: 3 }}>Minutes per recording (1–30)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                onClick={() => update({ max_recording_length: Math.max(1, (profile?.max_recording_length ?? 5) - 1) })}
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ab0e0', fontSize: 18, userSelect: 'none' }}
              >−</div>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#e2eaf4', minWidth: 24, textAlign: 'center' }}>
                {profile?.max_recording_length ?? 5}
              </span>
              <div
                onClick={() => update({ max_recording_length: Math.min(30, (profile?.max_recording_length ?? 5) + 1) })}
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ab0e0', fontSize: 18, userSelect: 'none' }}
              >+</div>
            </div>
          </div>
        </div>

        {/* Section: Security */}
        <div style={{ marginBottom: 8, fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Security</div>
        <div style={{ background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '16px 20px', marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0d2b1a', border: '1px solid #1a4a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#e2eaf4', fontWeight: 600, marginBottom: 4 }}>Recordings are secured</div>
              <div style={{ fontSize: 13, color: '#4a6a8a', lineHeight: 1.5 }}>Your audio files are stored privately. Playback links use unguessable IDs and require the exact link to access.</div>
            </div>
          </div>
        </div>

        {/* Log out */}
        <div
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '14px',
            background: '#1a1a2a',
            color: '#c0392b',
            border: '1px solid #2a1a1a',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          Log Out
        </div>
      </div>
    </div>
  )
}
