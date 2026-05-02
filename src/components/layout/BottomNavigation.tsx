import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { loadTestResult } from '../../lib/storage'

const bottomItems = [
  { to: '/', label: '홈' },
  { to: '/course', label: '코스', requiresTestResult: true },
  { to: '/test', label: '테스트' },
  { to: '/judge', label: '한마디', requiresTestResult: true },
]

export function BottomNavigation() {
  const [notice, setNotice] = useState('')
  const hasTestResult = Boolean(loadTestResult())

  function showProtectedNotice() {
    setNotice('선비유형 테스트 완료 후 이용 가능')
  }

  return (
    <>
      <nav className="bottom-nav" aria-label="하단 메뉴">
        {bottomItems.map((item) => {
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
                <span aria-hidden="true">•</span>
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
              <span aria-hidden="true">•</span>
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      {notice && (
        <p className="bottom-nav-notice" role="status">
          {notice}
        </p>
      )}
    </>
  )
}
