import '../styles/design-system.css'

const ITEMS = [
  {
    id: 'home',
    label: 'Studio',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
          stroke="currentColor" strokeWidth="1.2"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'upload',
    label: 'Evaluate',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M10 6v8M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.2"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6"
          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="16" rx="1"
          stroke="currentColor" strokeWidth="1.2"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'gallery',
    label: 'Archive',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1"
          stroke="currentColor" strokeWidth="1.2"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <rect x="11" y="2" width="7" height="7" rx="1"
          stroke="currentColor" strokeWidth="1.2"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <rect x="2" y="11" width="7" height="7" rx="1"
          stroke="currentColor" strokeWidth="1.2"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <rect x="11" y="11" width="7" height="7" rx="1"
          stroke="currentColor" strokeWidth="1.2"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
]

export default function BottomNav({ screen, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map(item => {
        const active = screen === item.id
        return (
          <button
            key={item.id}
            className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon(active)}
            <span className="t-micro bottom-nav__label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
