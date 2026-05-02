import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: '홈' },
  { to: '/course', label: '추천 코스' },
  { to: '/test', label: '선비 테스트' },
  { to: '/judge', label: '선비의 한마디' },
]

export function TopNavBar() {
  return (
    <header className="top-nav">
      <Link className="brand-link" to="/">
        <span className="brand-mark" aria-hidden="true">
          영
        </span>
        <span>
          <strong>영주선비길</strong>
          <small>YEONGJU SEONBI TRAIL</small>
        </span>
      </Link>
      <nav className="desktop-nav" aria-label="주요 메뉴">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="top-nav-actions">
        <Link className="nav-login-link" to="/login">
          로그인
        </Link>
      </div>
    </header>
  )
}
