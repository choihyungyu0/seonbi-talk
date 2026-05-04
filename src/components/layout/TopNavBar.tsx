import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  getCurrentUser,
  getStoredAuthUser,
  onAuthStateChange,
  signOut,
  type AuthUser,
} from '../../features/auth/authApi'
import { loadTestResult } from '../../lib/storage'
import { BrandLogo } from '../brand/BrandLogo'

const navItems = [
  { to: '/', label: '홈' },
  { to: '/course', label: '추천 코스', requiresTestResult: true },
  { to: '/test', label: '선비 테스트' },
  { to: '/judge', label: '선비의 한마디', requiresTestResult: true },
]

export function TopNavBar() {
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredAuthUser())
  const hasTestResult = Boolean(loadTestResult())

  useEffect(() => {
    const unsubscribe = onAuthStateChange(setAuthUser)
    void getCurrentUser().then(setAuthUser)
    return unsubscribe
  }, [])

  function showProtectedNotice() {
    setNotice('선비유형 테스트 완료 후 이용 가능')
  }

  async function handleSignOut() {
    await signOut()
    setAuthUser(null)
    navigate('/')
  }

  return (
    <header className="top-nav">
      <Link className="brand-link" to="/">
        <span className="brand-mark" aria-hidden="true">
          <BrandLogo decorative />
        </span>
        <span>
          <strong>영주선비길</strong>
          <small>YEONGJU SEONBI TRAIL</small>
        </span>
      </Link>
      <nav className="desktop-nav" aria-label="주요 메뉴">
        {navItems.map((item) => {
          const isDisabled = item.requiresTestResult && !hasTestResult

          if (isDisabled) {
            return (
              <button
                key={item.to}
                type="button"
                className="nav-disabled-link"
                aria-disabled="true"
                title="선비유형 테스트 완료 후 이용 가능"
                onClick={showProtectedNotice}
              >
                {item.label}
              </button>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setNotice('')}
            >
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="top-nav-actions">
        {notice && (
          <span className="nav-protected-notice" role="status">
            {notice}
          </span>
        )}
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
