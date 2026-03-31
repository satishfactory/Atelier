import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import '../styles/design-system.css'

const mdComponents = {
  p:  ({ children }) => <p className="companion-text">{children}</p>,
  h2: ({ children }) => <h2 className="t-heading" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-2)' }}>{children}</h2>,
  h3: ({ children }) => <h3 className="t-small" style={{ fontWeight: 500, marginTop: 'var(--space-4)', marginBottom: 'var(--space-1)' }}>{children}</h3>,
  hr: () => <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: 'var(--space-5) 0' }} />,
  strong: ({ children }) => <strong style={{ fontWeight: 600, fontStyle: 'normal' }}>{children}</strong>,
  table: ({ children }) => <table className="md-table">{children}</table>,
  th: ({ children }) => <th className="md-th">{children}</th>,
  td: ({ children }) => <td className="md-td">{children}</td>,
}

const API = 'http://localhost:3001/api/evaluate'
const USER_ID = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d'
const PAINTING_SLUG = 'satish_memory_lane'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function UploadScreen() {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [base64, setBase64] = useState(null)
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setBase64(await fileToBase64(file))
    setResponse(null)
    setError(null)
  }

  async function handleSubmit() {
    if (!base64) return
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callType: 'evaluate_painting',
          paintingSlug: PAINTING_SLUG,
          userId: USER_ID,
          paintingImage: base64,
          userMessage: message || 'What do you see?',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setResponse(data.response)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-screen">

      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFile} />

      <div className={`upload-area${preview ? ' upload-area--has-image' : ''}`}
        onClick={() => inputRef.current.click()}>
        {preview
          ? <img src={preview} alt="Selected painting" className="upload-preview" />
          : <div className="upload-prompt">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.2" />
                <path d="M16 10v12M10 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="t-small" style={{ marginTop: 'var(--space-3)', color: 'var(--text-muted)' }}>
                Tap to photograph or upload a painting
              </p>
            </div>
        }
      </div>

      {preview && (
        <p className="t-micro upload-change-link" onClick={() => inputRef.current.click()}>
          Change image
        </p>
      )}

      <div className="upload-form">
        <textarea
          className="upload-textarea"
          placeholder="What do you see?"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
        />
        <button
          className="btn btn-warm upload-submit"
          onClick={handleSubmit}
          disabled={!base64 || loading}
        >
          {loading ? 'Thinking…' : 'Submit to companion'}
        </button>
      </div>

      {loading && (
        <div className="upload-response">
          <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 'var(--space-3)' }} />
          <div className="skeleton" style={{ height: 16, width: '60%' }} />
        </div>
      )}

      {error && (
        <p className="t-small upload-response" style={{ color: 'var(--coral)' }}>{error}</p>
      )}

      {response && (
        <div className="upload-response companion-message">
          <ReactMarkdown components={mdComponents}>{response}</ReactMarkdown>
        </div>
      )}

    </div>
  )
}
