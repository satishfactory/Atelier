import { useState, useEffect, useRef } from 'react'
import { getPaintingImages, SERVER } from '../lib/supabase'

export default function WipImageManager({ painting, onClose, onMainImageChanged }) {
  const [images, setImages]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [setting, setSetting]   = useState(null) // imageUrl being set as main
  const fileRef = useRef()

  const currentMain = painting.image_url

  useEffect(() => {
    getPaintingImages(painting.slug)
      .then(setImages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [painting.slug])

  async function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return
    setUploading(true)
    try {
      const b64 = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload  = ev => resolve(ev.target.result.split(',')[1])
        r.onerror = reject
        r.readAsDataURL(f)
      })
      const res = await fetch(`${SERVER}/api/upload-painting-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: painting.slug, imageBase64: b64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const fresh = await getPaintingImages(painting.slug)
      setImages(fresh)
      await setMain(data.imageUrl)
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  async function setMain(imageUrl) {
    setSetting(imageUrl)
    try {
      const res = await fetch(`${SERVER}/api/set-main-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: painting.slug, imageUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onMainImageChanged(painting.slug, imageUrl)
    } catch (err) { alert(err.message) }
    finally { setSetting(null) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,30,28,0.6)', zIndex: 999,
      display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: '16px 16px 0 0', width: '100%',
        padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>{painting.title}</p>
            <p className="t-micro" style={{ color: 'var(--text-muted)' }}>Tap an image to set as main</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }}>×</button>
        </div>

        {loading
          ? <p className="t-micro" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          : images.length === 0
            ? <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 20 }}>No images yet. Upload your first photo.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {images.map(img => {
                  const isMain = img.image_url === currentMain
                  const isLoading = setting === img.image_url
                  return (
                    <div key={img.id} onClick={() => !isMain && setMain(img.image_url)}
                      style={{ position: 'relative', cursor: isMain ? 'default' : 'pointer',
                        borderRadius: 6, overflow: 'hidden',
                        outline: isMain ? '2px solid var(--warm)' : '2px solid transparent' }}>
                      <img src={img.image_url} alt={img.version_label}
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      {isMain && (
                        <div style={{ position: 'absolute', top: 5, right: 5, background: 'var(--warm)',
                          borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 11, color: 'white' }}>✓</div>
                      )}
                      {isLoading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,119,61,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>…</div>
                      )}
                      <p className="t-micro" style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(30,30,28,0.5)', color: 'white', padding: '3px 6px', textAlign: 'center' }}>
                        {img.version_label}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
        }

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <button className="btn btn-warm" style={{ width: '100%', padding: 13, fontSize: 14 }}
          onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Upload new photo'}
        </button>
      </div>
    </div>
  )
}
