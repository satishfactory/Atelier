import { useState } from 'react'
import './styles/design-system.css'
import HomeScreen from './screens/HomeScreen'
import GalleryScreen from './screens/GalleryScreen'
import UploadScreen from './screens/UploadScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  const [screen, setScreen] = useState('home')

  return (
    <div className="app-shell">
      <main className="app-main">
        {screen === 'home'    && <HomeScreen />}
        {screen === 'upload'  && <UploadScreen />}
        {screen === 'gallery' && <GalleryScreen />}
      </main>
      <BottomNav screen={screen} onNavigate={setScreen} />
    </div>
  )
}
