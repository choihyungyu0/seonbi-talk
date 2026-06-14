import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  getCurrentUser,
  getStoredAuthUser,
  onAuthStateChange,
  signOut,
  type AuthUser,
} from '../../features/auth/authApi'
import { BrandLogo } from '../brand/BrandLogo'

const navItems = [
  { to: '/', label: '홈' },
  { to: '/course', label: '추천 코스' },
  { to: '/heatmap', label: '관광 데이터' },
  { to: '/knowledge-graph', label: 'AI 근거 그래프' },
  { to: '/test', label: '선비 테스트' },
  { to: '/judge', label: '선비의 한마디' },
]

export function TopNavBar() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredAuthUser())

  useEffect(() => {
    const unsubscribe = onAuthStateChange(setAuthUser)
    void getCurrentUser().then(setAuthUser)
    return unsubscribe
  }, [])

  async function handleSignOut() {
    await signOut()
    setAuthUser(null)
    navigate('/')
  }

  return (
    <header className="top-nav">
      <Link className="brand-link" to="/">
        <span className="brand-mark">
          <BrandLogo variant="mark" />
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
        {authUser ? (
          <>
            <Link className="nav-login-link" to="/mypage">
              마이페이지
            </Link>
            <span className="nav-user-label">
              {authUser.nickname || authUser.email || '로그인 사용자'}
            </span>
            <button
              type="button"
              className="nav-login-link nav-button-link"
              onClick={handleSignOut}
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link className="nav-login-link" to="/login">
              로그인
            </Link>
            <Link className="nav-login-link" to="/signup">
              회원가입
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
