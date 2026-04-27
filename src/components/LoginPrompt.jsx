import './public.css'

export default function LoginPrompt({ onLogin, onDismiss }) {
  return (
    <div className="login-prompt-backdrop" onClick={onDismiss}>
      <div className="login-prompt" onClick={e => e.stopPropagation()}>
        <h2>This space is for working artists.</h2>
        <p>
          Atelier is a private AI studio companion — for painters who want to
          think more deeply about their work, not just share it.
        </p>
        <div className="login-prompt__actions">
          <button className="btn btn-warm" style={{ width: '100%', padding: '13px 0', fontSize: '1rem' }}
            onClick={onLogin}>
            Enter the studio
          </button>
          <a href="mailto:satish@satishfactory.com"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--accent)' }}>
            Request access
          </a>
        </div>
        <button className="login-prompt__dismiss" onClick={onDismiss}>
          Continue browsing
        </button>
      </div>
    </div>
  )
}
