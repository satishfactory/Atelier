import { useRef } from 'react'

// Compact multi-photo picker.
// props: files (File[]), onChange(files[])
export default function PhotoStrip({ files, onChange }) {
  const inputRef = useRef()

  function handlePick(e) {
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return
    onChange([...files, ...picked].slice(0, 6)) // max 6
    e.target.value = ''
  }

  function remove(idx) {
    onChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>

      {/* Drop zone — compact */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          height: 100,
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginBottom: files.length ? 'var(--space-3)' : 0,
        }}
      >
        <p className="t-small" style={{ color: 'var(--text-muted)' }}>
          {files.length ? '+ Add another photo' : 'Tap to choose photos'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handlePick}
      />

      {/* Thumbnail strip */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {files.map((f, i) => {
            const url = URL.createObjectURL(f)
            return (
              <div key={i} style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                <img
                  src={url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)', border: i === 0 ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                />
                {i === 0 && (
                  <span style={{ position: 'absolute', bottom: 2, left: 2, background: 'var(--accent)',
                    color: 'var(--white)', fontSize: '0.55rem', padding: '1px 4px',
                    borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)' }}>
                    main
                  </span>
                )}
                <button
                  onClick={() => remove(i)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                    borderRadius: 'var(--radius-full)', background: 'var(--dark)', color: 'var(--white)',
                    border: 'none', cursor: 'pointer', fontSize: '0.65rem', lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
