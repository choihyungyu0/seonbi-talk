import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { loadTestResult } from '../../lib/storage'

const navItems = [
  { to: '/', label: '홈' },
  { to: '/course', label: '추천 코스', requiresTestResult: true },
  { to: '/test', label: '선비 테스트' },
  { to: '/judge', label: '선비의 한마디', requiresTestResult: true },
]

export function TopNavBar() {
  const [notice, setNotice] = useState('')
  const hasTestResult = Boolean(loadTestResult())

  function showProtectedNotice() {
    setNotice('선비유형 테스트 완료 후 이용 가능')
  }

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
        <Link className="nav-login-link" to="/login">
          로그인
        </Link>
      </div>
    </header>
  )
}
