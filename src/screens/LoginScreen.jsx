import { useState } from 'react'
import '../styles/design-system.css'
import { signIn, signUp } from '../lib/supabase'

export default function LoginScreen() {
  const [mode,     setMode]     = useState('signin') // 'signin' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [confirm,  setConfirm]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password)
        setConfirm(true)
      } else {
        await signIn(email.trim(), password)
        // App.jsx auth listener handles the redirect
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 var(--space-5)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Atelier</h1>
      <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 40 }}>Your private AI studio companion</p>

      {confirm ? (
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', lineHeight: 1.7, color: 'var(--text)', marginBottom: 12 }}>
            Check your email to confirm your account, then sign in.
          </p>
          <button className="btn" onClick={() => { setConfirm(false); setMode('signin') }}>Back to sign in</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required autoComplete="email"
            className="upload-textarea"
            style={{ padding: '12px 16px', fontSize: 15, borderRadius: 'var(--radius-sm)' }} />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="upload-textarea"
            style={{ padding: '12px 16px', fontSize: 15, borderRadius: 'var(--radius-sm)' }} />

          {error && (
            <p className="t-small" style={{ color: 'var(--coral)', marginTop: -4 }}>{error}</p>
          )}

          <button type="submit" className="btn btn-warm" disabled={loading} style={{ fontSize: 15, padding: '12px 0' }}>
            {loading ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <p className="t-small" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <span style={{ color: 'var(--warm)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}>
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </span>
          </p>
        </form>
      )}
    </div>
  )
}
