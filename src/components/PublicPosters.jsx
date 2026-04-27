import { useState, useEffect } from 'react'
import { getPublicBlogPosts } from '../lib/supabase'
import './public.css'

// Static quotes — always shown even before DB loads
const STATIC_QUOTES = [
  { text: 'The indecision is the painting\'s intelligence, not your uncertainty.', attr: 'Atelier companion' },
  { text: 'The paint does not lie. It just waits for you to catch up.', attr: 'Process journal' },
  { text: 'Both things are true at once. That is what I came to accept.', attr: 'Artist note' },
  { text: 'You are not failing to decide; you are succeeding at the harder thing: holding the ambiguity.', attr: 'Atelier companion' },
  { text: 'Grief has a way of disguising itself as a colour problem, an afternoon in the studio.', attr: 'Process journal' },
]

// Poster colour themes — all from design system vars
const THEMES = [
  { bg: 'var(--dark)',    text: 'var(--white)',   accent: 'var(--warm)' },
  { bg: 'var(--surface)', text: 'var(--text)',    accent: 'var(--accent)' },
  { bg: 'var(--accent)',  text: 'var(--white)',   accent: 'var(--white)' },
  { bg: 'var(--cool)',    text: 'var(--white)',   accent: 'rgba(255,255,255,0.7)' },
  { bg: 'var(--surface)', text: 'var(--text)',    accent: 'var(--cool)' },
]

function excerpt(text, max = 160) {
  if (!text) return ''
  const clean = text.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').trim()
  return clean.length <= max ? clean : clean.slice(0, clean.lastIndexOf(' ', max)) + '…'
}

export default function PublicPosters({ onLogin }) {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    getPublicBlogPosts().then(setPosts).catch(() => {})
  }, [])

  // Merge static quotes + blog excerpts into poster cards
  const cards = [
    ...STATIC_QUOTES.map((q, i) => ({ type: 'quote', text: q.text, attr: q.attr, theme: THEMES[i % THEMES.length] })),
    ...posts.map((p, i) => ({ type: 'blog', text: excerpt(p.full_text), attr: p.title, theme: THEMES[(i + 2) % THEMES.length] })),
  ]

  if (!cards.length) return null

  return (
    <section className="public-posters">
      <p className="public-posters__label">From the studio journal</p>
      <div className="public-posters__grid">
        {cards.map((card, i) => (
          <div key={i} className="poster-card"
            style={{ background: card.theme.bg, cursor: 'pointer' }}
            onClick={onLogin}>
            <div className="poster-card__mark" style={{ color: card.theme.accent }}>"</div>
            <p className="poster-card__text" style={{ color: card.theme.text }}>{card.text}</p>
            <p className="poster-card__attr" style={{ color: card.theme.accent }}>— {card.attr}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
