import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MicIcon } from '../components/MicIcon'

const s = {
  page: { minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  card: { width: '100%', maxWidth: 400, background: '#131c2b', border: '1px solid #1e2d40', borderRadius: 14, padding: '40px 32px' },
  logo: { textAlign: 'center', marginBottom: 40 },
  logoIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoTitle: { fontSize: 26, fontWeight: 700, color: '#e2eaf4', letterSpacing: '-0.5px' },
  logoSub: { fontSize: 14, color: '#4a6a8a', marginTop: 6 },
  label: { display: 'block', fontSize: 12, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 },
  input: { width: '100%', background: '#0d1117', border: '1px solid #1e2d40', borderRadius: 10, padding: '14px 16px', color: '#e2eaf4', fontSize: 16, outline: 'none', marginBottom: 16 },
  btn: { width: '100%', padding: '14px', background: '#1a2f47', color: '#7ab0e0', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 12 },
  error: { background: '#2a1a1a', border: '1px solid #c0392b', borderRadius: 8, padding: '12px 16px', color: '#e07070', fontSize: 14, marginBottom: 16 },
  success: { background: '#1a2a1a', border: '1px solid #2a7a2a', borderRadius: 8, padding: '12px 16px', color: '#70e070', fontSize: 14, marginBottom: 16 },
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when it detects the reset token in the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if a session is already active (token already consumed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.')
    if (newPassword !== confirmPassword) return setError('Passwords do not match.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess('Password updated! Redirecting…')
      setTimeout(() => navigate('/'), 2000)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIcon}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a2f47', border: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MicIcon size={28} color="#7ab0e0" strokeWidth={2} />
            </div>
          </div>
          <div style={s.logoTitle}>Echo Mail</div>
          <div style={s.logoSub}>Set a new password</div>
        </div>

        {!ready ? (
          <div style={{ textAlign: 'center', color: '#4a6a8a', fontSize: 14 }}>
            Verifying reset link…
          </div>
        ) : (
          <>
            {error && <div style={s.error}>{error}</div>}
            {success && <div style={s.success}>{success}</div>}

            {!success && (
              <form onSubmit={handleSubmit}>
                <label style={s.label}>New Password</label>
                <input
                  style={s.input}
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <label style={s.label}>Confirm Password</label>
                <input
                  style={s.input}
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
                  {loading ? 'Updating…' : 'Set New Password'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
