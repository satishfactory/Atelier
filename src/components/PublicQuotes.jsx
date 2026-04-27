import { useState, useEffect } from 'react'
import { getPublicBlogPosts } from '../lib/supabase'
import './public.css'

function excerpt(text, max = 220) {
  if (!text) return ''
  const clean = text.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').trim()
  return clean.length <= max ? clean : clean.slice(0, clean.lastIndexOf(' ', max)) + '…'
}

export default function PublicQuotes({ onLogin }) {
  const [posts,  setPosts]  = useState([])
  const [idx,    setIdx]    = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    getPublicBlogPosts().then(setPosts).catch(() => {})
  }, [])

  useEffect(() => {
    if (posts.length < 2) return
    const t = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIdx(i => (i + 1) % posts.length)
        setFading(false)
      }, 600)
    }, 7000)
    return () => clearInterval(t)
  }, [posts])

  const post = posts[idx]
  if (!post) return null

  return (
    <section className="public-quotes">
      <div className="public-quote__mark">"</div>
      <p className={`public-quote__text${fading ? ' fade' : ''}`}>
        {excerpt(post.full_text)}
      </p>
      <p className="public-quote__attr">{post.title}</p>
      <button className="public-quote__read" onClick={onLogin}>
        Read in full →
      </button>
    </section>
  )
}
