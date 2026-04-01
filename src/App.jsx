import { useState } from 'react'
import './styles/design-system.css'
import HomeScreen from './screens/HomeScreen'
import GalleryScreen from './screens/GalleryScreen'
import UploadScreen from './screens/UploadScreen'
import PaintingDetailScreen from './screens/PaintingDetailScreen'
import BlogScreen from './screens/BlogScreen'
import ProfileScreen from './screens/ProfileScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [selectedSlug, setSelectedSlug] = useState(null)

  function openPainting(painting) {
    setSelectedSlug(painting.slug)
    setScreen('detail')
  }

  function goBack() {
    setScreen(selectedSlug ? 'gallery' : 'home')
    setSelectedSlug(null)
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        {screen === 'home'    && <HomeScreen    onPaintingClick={openPainting} />}
        {screen === 'upload'  && <UploadScreen  />}
        {screen === 'gallery' && <GalleryScreen onPaintingClick={openPainting} />}
        {screen === 'blog'    && <BlogScreen />}
        {screen === 'profile' && <ProfileScreen onPaintingClick={openPainting} />}
        {screen === 'detail'  && <PaintingDetailScreen slug={selectedSlug} onBack={goBack} />}
      </main>
      {screen !== 'detail' && <BottomNav screen={screen} onNavigate={setScreen} />}
    </div>
  )
}
