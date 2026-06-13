import { NavLink } from 'react-router-dom'

const bottomItems = [
  { to: '/', label: '홈' },
  { to: '/course', label: '코스' },
  { to: '/heatmap', label: '히트맵' },
  { to: '/test', label: '테스트' },
  { to: '/judge', label: '한마디' },
]

export function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {bottomItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <span aria-hidden="true">•</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
