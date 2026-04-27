import { useState, useEffect } from 'react'
import './styles/design-system.css'
import { supabase, signOut } from './lib/supabase'
import HomeScreen from './screens/HomeScreen'
import GalleryScreen from './screens/GalleryScreen'
import UploadScreen from './screens/UploadScreen'
import PaintingDetailScreen from './screens/PaintingDetailScreen'
import BlogScreen from './screens/BlogScreen'
import ProfileScreen from './screens/ProfileScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import LoginScreen from './screens/LoginScreen'
import PublicLanding from './components/PublicLanding'
import BottomNav from './components/BottomNav'

export default function App() {
  const [screen,       setScreen]       = useState('home')
  const [selectedSlug, setSelectedSlug] = useState(null)
  const [onboarded,    setOnboarded]    = useState(() => !!localStorage.getItem('onboarding_complete'))
  const [userId,       setUserId]       = useState(null)
  const [authReady,    setAuthReady]    = useState(false)
  const [showLogin,    setShowLogin]    = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  function openPainting(painting) {
    setSelectedSlug(painting.slug)
    setScreen('detail')
  }

  function goBack() {
    setScreen(selectedSlug ? 'gallery' : 'home')
    setSelectedSlug(null)
  }

  if (!authReady) return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="t-small" style={{ color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  )

  if (!userId) {
    if (showLogin) return <LoginScreen onBack={() => setShowLogin(false)} />
    return <PublicLanding onLogin={() => setShowLogin(true)} />
  }

  if (!onboarded) return <OnboardingScreen userId={userId} onComplete={() => setOnboarded(true)} />

  return (
    <div className="app-shell">
      <main className="app-main">
        {screen === 'home'    && <HomeScreen    userId={userId} onPaintingClick={openPainting} onNavigate={setScreen} onSignOut={signOut} />}
        {screen === 'upload'  && <UploadScreen  userId={userId} onPaintingClick={openPainting} onNavigate={setScreen} />}
        {screen === 'gallery' && <GalleryScreen userId={userId} onPaintingClick={openPainting} onNavigate={setScreen} />}
        {screen === 'blog'    && <BlogScreen    userId={userId} onPaintingClick={openPainting} onNavigate={setScreen} />}
        {screen === 'profile' && <ProfileScreen userId={userId} onPaintingClick={openPainting} onNavigate={setScreen} onSignOut={signOut} />}
        {screen === 'detail'  && <PaintingDetailScreen userId={userId} slug={selectedSlug} onBack={goBack} onNavigate={setScreen} onPaintingClick={openPainting} />}
      </main>
      {screen !== 'detail' && <BottomNav screen={screen} onNavigate={setScreen} />}
    </div>
  )
}
