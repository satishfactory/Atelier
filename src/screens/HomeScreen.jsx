import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getPaintings, getInspirations, getBlogPosts, getLatestStudioLog, SERVER } from '../lib/supabase'
import { useSpeech, SpeakButton } from '../lib/useVoiceInput.jsx'
import PaintingCard from '../components/PaintingCard'
import InfluencesSection from '../components/InfluencesSection'
import WipImageManager from '../components/WipImageManager'
import HomeBlogRow from '../components/HomeBlogRow'
import StudioLogEntry from '../components/StudioLogEntry'
import StyleDNARadar from '../components/StyleDNARadar'

function SectionLabel({ children }) {
  return (
    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', fontWeight: 600,
      letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--warm)',
      marginBottom: 'var(--space-3)' }}>
      {children}
    </p>
  )
}

export default function HomeScreen({ userId, onPaintingClick, onNavigate, onSignOut }) {
  const [paintings,        setPaintings]        = useState([])
  const [inspirations,     setInspirations]     = useState([])
  const [blogPosts,        setBlogPosts]        = useState([])
  const [managingPainting, setManagingPainting] = useState(null)
  const [logOpen,          setLogOpen]          = useState(false)
  const [latestLog,        setLatestLog]        = useState(null)
  const { speaking, speak, stop } = useSpeech()

  useEffect(() => {
    getPaintings(userId, { type: 'artist_work' }).then(setPaintings).catch(() => {})
    getInspirations(userId).then(setInspirations).catch(() => {})
    getBlogPosts(userId).then(setBlogPosts).catch(() => {})
    if (userId) getLatestStudioLog(userId).then(setLatestLog).catch(() => {})
  }, [])

  const paintingMap = Object.fromEntries(paintings.map(p => [p.slug, p]))
  const blogSlugs   = new Set(blogPosts.map(b => b.painting_slug).filter(Boolean))
  const wip         = paintings.filter(p => p.status === 'wip')
  const finished    = paintings.filter(p => p.status === 'finished')
  const dueReview   = finished.filter(p => !blogSlugs.has(p.slug))
  const recentBlogs = blogPosts.slice(0, 3)
  const topInfluence = inspirations[0]

  return (
    <div className="home-screen">

      {/* 1 — Companion greeting */}
      <header className="home-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1 className="t-display home-wordmark">Atelier</h1>
          <button className="btn" style={{ fontSize: 11, marginTop: 4 }} onClick={() => setLogOpen(true)}>
            Log session +
          </button>
        </div>
        <div className="companion-message" style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 16, marginTop: 16 }}>
          <p className="companion-text" style={{ fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Your studio is ready. What are you working on today?
          </p>
        </div>
        {latestLog && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
            border: '0.5px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warm)', textTransform: 'capitalize', whiteSpace: 'nowrap', marginTop: 1 }}>{latestLog.state}</span>
            <p className="t-micro" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{latestLog.note?.slice(0, 120)}{latestLog.note?.length > 120 ? '…' : ''}</p>
          </div>
        )}
      </header>

      {logOpen && (
        <StudioLogEntry
          userId={userId}
          wipPaintings={wip}
          onSaved={entry => setLatestLog({ state: entry.mood, note: entry.note, session_date: new Date().toISOString().split('T')[0] })}
          onClose={() => setLogOpen(false)}
        />
      )}

      {/* 2 — What you're working on */}
      <section className="home-section">
        <SectionLabel>What you're working on</SectionLabel>
        {wip.length === 0
          ? <div style={{ padding: '12px 0' }}>
              <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
                No paintings in progress. Start something.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-warm" style={{ fontSize: 13 }} onClick={() => onNavigate?.('upload')}>Start evaluating →</button>
                <button className="btn" style={{ fontSize: 13 }} onClick={() => onNavigate?.('gallery')}>Explore masterpieces →</button>
              </div>
            </div>
          : <div className="gallery-grid gallery-grid--flush">
              {wip.map(p => (
                <PaintingCard key={p.slug} painting={p}
                  onClick={() => onPaintingClick?.(p)}
                  onCameraClick={() => setManagingPainting(p)} />
              ))}
            </div>
        }
      </section>

      {/* 3 — What you've made */}
      {finished.length > 0 && (
        <section className="home-section">
          <SectionLabel>What you've made</SectionLabel>
          <div className="gallery-grid gallery-grid--flush">
            {finished.map(p => <PaintingCard key={p.slug} painting={p} onClick={() => onPaintingClick?.(p)} />)}
          </div>
        </section>
      )}

      {/* 3b — Style DNA */}
      {paintings.filter(p => p.score_overall != null).length >= 2 && (
        <section className="home-section">
          <StyleDNARadar paintings={paintings} />
        </section>
      )}

      {/* 4 — What's shaping your practice */}
      {inspirations.length > 0 && (
        <section className="home-section">
          <SectionLabel>What's shaping your practice</SectionLabel>
          <InfluencesSection inspirations={inspirations} />
        </section>
      )}

      {/* 5 — Ready to write about */}
      {dueReview.length > 0 && (
        <section className="home-section">
          <SectionLabel>Ready to write about</SectionLabel>
          <div className="gallery-grid gallery-grid--flush">
            {dueReview.map(p => <PaintingCard key={p.slug} painting={p} onClick={() => onPaintingClick?.(p)} />)}
          </div>
        </section>
      )}

      {/* 6 — Your process, documented */}
      {recentBlogs.length > 0 && (
        <section className="home-section">
          <SectionLabel>Your process, documented</SectionLabel>
          {recentBlogs.map(b => (
            <HomeBlogRow key={b.id} post={b}
              painting={paintingMap[b.painting_slug] || null}
              onClick={() => onNavigate?.('blog')} />
          ))}
        </section>
      )}

      {managingPainting && (
        <WipImageManager
          painting={managingPainting}
          onClose={() => setManagingPainting(null)}
          onMainImageChanged={(slug, imageUrl) => {
            setPaintings(prev => prev.map(p => p.slug === slug ? { ...p, image_url: imageUrl } : p))
            setManagingPainting(null)
          }}
        />
      )}
    </div>
  )
}
