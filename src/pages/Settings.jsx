import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getProfile, upsertProfile } from '../lib/supabase'

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 28, borderRadius: 14,
        background: checked ? '#1a4a7a' : '#1a2332',
        border: `1px solid ${checked ? '#2a6aaa' : '#1e2d40'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 22 : 3, width: 20, height: 20,
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

function SectionLabel({ text }) {
  return <div style={{ marginBottom: 8, fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{text}</div>
}

export default function Settings() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userEmail, setUserEmail] = useState('')

  // Destination email
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Change password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      setUserId(data.session.user.id)
      setUserEmail(data.session.user.email || '')
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
    try { await upsertProfile(userId, patch) } catch (err) { console.error(err) }
  }

  const saveEmail = async () => {
    setSaving(true); setSaveMsg('')
    try {
      await upsertProfile(userId, { destination_email: email })
      setProfile(p => ({ ...p, destination_email: email }))
      setSaveMsg('Saved!')
    } catch (err) { setSaveMsg('Error: ' + (err.message || 'Could not save')) }
    finally { setSaving(false); setTimeout(() => setSaveMsg(''), 2500) }
  }

  const changePassword = async () => {
    setPwError(''); setPwMsg('')
    if (!newPassword) return setPwError('Enter a new password.')
    if (newPassword.length < 6) return setPwError('Password must be at least 6 characters.')
    if (newPassword !== confirmPassword) return setPwError('Passwords do not match.')
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPwError(error.message)
    else { setPwMsg('Password updated!'); setNewPassword(''); setConfirmPassword('') }
    setPwSaving(false)
    setTimeout(() => { setPwMsg(''); setPwError('') }, 3000)
  }

  const handleDeleteAccount = async () => {
    if (deleteInput.toLowerCase() !== 'delete') {
      setDeleteError('Type DELETE (all caps or lowercase) to confirm.')
      return
    }
    setDeleting(true); setDeleteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Delete failed')
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  const inputStyle = {
    width: '100%', background: '#0d1117', border: '1px solid #1e2d40',
    borderRadius: 10, padding: '12px 14px', color: '#e2eaf4',
    fontSize: 16, outline: 'none', marginBottom: 12,
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

      <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto' }}>

        {/* Destination email */}
        <SectionLabel text="Destination" />
        <div style={{ background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '20px', marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#4a6a8a', marginBottom: 8 }}>Send recordings to</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
          <div onClick={saveEmail} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '13px', background: '#1a2f47', color: '#7ab0e0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, userSelect: 'none' }}>
            {saving ? 'Saving…' : saveMsg || 'Save email address'}
          </div>
        </div>

        {/* Preferences */}
        <SectionLabel text="Preferences" />
        <div style={{ background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '0 20px', marginBottom: 24 }}>
          <Row label="Confirm before delete" sublabel="Show a prompt when deleting recordings"
            right={<Toggle checked={profile?.confirm_before_delete ?? false} onChange={v => update({ confirm_before_delete: v })} />} />
          <Row label="Keep screen awake" sublabel="Prevent sleep while recording"
            right={<Toggle checked={profile?.keep_screen_awake ?? true} onChange={v => update({ keep_screen_awake: v })} />} />
          <Row label="Auto-start recording" sublabel="Begin recording immediately on launch"
            right={<Toggle checked={profile?.auto_start_recording ?? false} onChange={v => update({ auto_start_recording: v })} />} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #1e2d40' }}>
            <div>
              <div style={{ fontSize: 15, color: '#e2eaf4' }}>Auto-delete recordings</div>
              <div style={{ fontSize: 12, color: '#4a6a8a', marginTop: 3 }}>Remove recordings older than</div>
            </div>
            <select
              value={profile?.auto_delete_days ?? ''}
              onChange={e => update({ auto_delete_days: e.target.value === '' ? null : Number(e.target.value) })}
              style={{ background: '#1a2f47', border: '1px solid #1e2d40', borderRadius: 8, color: '#e2eaf4', fontSize: 14, padding: '6px 10px', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">Off</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
            <div>
              <div style={{ fontSize: 15, color: '#e2eaf4' }}>Max recording length</div>
              <div style={{ fontSize: 12, color: '#4a6a8a', marginTop: 3 }}>Minutes per recording (1–30)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div onClick={() => update({ max_recording_length: Math.max(1, (profile?.max_recording_length ?? 5) - 1) })}
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ab0e0', fontSize: 18, userSelect: 'none' }}>−</div>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#e2eaf4', minWidth: 24, textAlign: 'center' }}>{profile?.max_recording_length ?? 5}</span>
              <div onClick={() => update({ max_recording_length: Math.min(30, (profile?.max_recording_length ?? 5) + 1) })}
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ab0e0', fontSize: 18, userSelect: 'none' }}>+</div>
            </div>
          </div>
        </div>

        {/* Change password */}
        <SectionLabel text="Security" />
        <div style={{ background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#4a6a8a', marginBottom: 4 }}>Signed in as</div>
          <div style={{ fontSize: 14, color: '#e2eaf4', marginBottom: 16 }}>{userEmail}</div>

          <label style={{ display: 'block', fontSize: 12, color: '#4a6a8a', marginBottom: 8 }}>New password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
          <label style={{ display: 'block', fontSize: 12, color: '#4a6a8a', marginBottom: 8 }}>Confirm new password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, marginBottom: 0 }} />

          {pwError && <div style={{ fontSize: 13, color: '#e07070', marginTop: 8 }}>{pwError}</div>}
          {pwMsg  && <div style={{ fontSize: 13, color: '#4ade80', marginTop: 8 }}>{pwMsg}</div>}

          <div onClick={changePassword} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12, width: '100%', padding: '13px', background: '#1a2f47', color: '#7ab0e0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: pwSaving ? 'default' : 'pointer', opacity: pwSaving ? 0.7 : 1, userSelect: 'none' }}>
            {pwSaving ? 'Updating…' : 'Update password'}
          </div>

          {/* Secure recordings badge */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 20, paddingTop: 20, borderTop: '1px solid #1e2d40' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0d2b1a', border: '1px solid #1a4a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#e2eaf4', fontWeight: 600, marginBottom: 4 }}>Recordings are secured</div>
              <div style={{ fontSize: 13, color: '#4a6a8a', lineHeight: 1.5 }}>Audio files are stored privately. Playback links use encrypted IDs.</div>
            </div>
          </div>
        </div>

        {/* Log out */}
        <div onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '14px', background: '#1a2332', color: '#7ab0e0', border: '1px solid #1e2d40', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', userSelect: 'none', marginBottom: 12 }}>
          Log Out
        </div>

        {/* Delete account */}
        <div onClick={() => setShowDeleteModal(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '14px', background: '#1a1a2a', color: '#c0392b', border: '1px solid #2a1a1a', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', userSelect: 'none', marginBottom: 32 }}>
          Delete Account
        </div>
      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
          <div style={{ background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: 28, width: '100%', maxWidth: 360 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e2eaf4', marginBottom: 8 }}>Delete account?</div>
            <div style={{ fontSize: 14, color: '#4a6a8a', lineHeight: 1.6, marginBottom: 20 }}>
              This will permanently delete your account, all recordings, and all stored audio. This cannot be undone.
            </div>
            <label style={{ display: 'block', fontSize: 12, color: '#4a6a8a', marginBottom: 8 }}>
              Type <strong style={{ color: '#e2eaf4' }}>DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              style={{ width: '100%', background: '#0d1117', border: '1px solid #c0392b', borderRadius: 10, padding: '12px 14px', color: '#e2eaf4', fontSize: 16, outline: 'none', marginBottom: 8 }}
            />
            {deleteError && <div style={{ fontSize: 13, color: '#e07070', marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <div onClick={() => { setShowDeleteModal(false); setDeleteInput(''); setDeleteError('') }}
                style={{ flex: 1, padding: '13px', background: '#1a2332', color: '#7ab0e0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'center', userSelect: 'none' }}>
                Cancel
              </div>
              <div onClick={handleDeleteAccount}
                style={{ flex: 1, padding: '13px', background: deleting ? '#2a1a1a' : '#c0392b', color: '#fff', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: deleting ? 'default' : 'pointer', textAlign: 'center', userSelect: 'none', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
