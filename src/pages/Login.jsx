import { useState } from 'react'
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
  toggle: { textAlign: 'center', marginTop: 16 },
  toggleLink: { color: '#7ab0e0', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' },
  error: { background: '#2a1a1a', border: '1px solid #c0392b', borderRadius: 8, padding: '12px 16px', color: '#e07070', fontSize: 14, marginBottom: 16 },
  success: { background: '#1a2a1a', border: '1px solid #2a7a2a', borderRadius: 8, padding: '12px 16px', color: '#70e070', fontSize: 14, marginBottom: 16 },
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const switchMode = (next) => { setMode(next); setError(''); setSuccess('') }

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Check your email to confirm your account.')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setSuccess('Check your email for a password reset link.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const subtitle = mode === 'login' ? 'Sign in to your account'
    : mode === 'signup' ? 'Create your account'
    : 'Reset your password'

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
          <div style={s.logoSub}>{subtitle}</div>
        </div>

        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        <form onSubmit={handle}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          {mode !== 'forgot' && (
            <>
              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </>
          )}

          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Please wait…'
              : mode === 'login' ? 'Sign In'
              : mode === 'signup' ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        {mode === 'login' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <button style={{ ...s.toggleLink, fontSize: 13, color: '#4a6a8a' }} onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            </div>
            <div style={s.toggle}>
              <button style={s.toggleLink} onClick={() => switchMode('signup')}>
                Don't have an account? Sign up
              </button>
            </div>
          </>
        )}

        {mode === 'signup' && (
          <div style={s.toggle}>
            <button style={s.toggleLink} onClick={() => switchMode('login')}>
              Already have an account? Sign in
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div style={s.toggle}>
            <button style={s.toggleLink} onClick={() => switchMode('login')}>
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
