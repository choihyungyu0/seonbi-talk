import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'

type AdminSessionStatus = 'checking' | 'authenticated' | 'unauthenticated'

export function AdminPage() {
  const navigate = useNavigate()
  const [sessionStatus, setSessionStatus] = useState<AdminSessionStatus>('checking')
  const [statusMessage, setStatusMessage] = useState('')
  const isCheckingSession = sessionStatus === 'checking'
  const isAuthenticated = sessionStatus === 'authenticated'

  useEffect(() => {
    let ignore = false

    async function checkAdminSession() {
      try {
        const response = await fetch('/api/admin/session', {
          method: 'GET',
          credentials: 'include',
        })
        const data = (await response.json().catch(() => ({}))) as { ok?: boolean }
        if (ignore) return

        if (response.ok && data.ok) {
          setSessionStatus('authenticated')
          return
        }

        setSessionStatus('unauthenticated')
      } catch {
        if (!ignore) setSessionStatus('unauthenticated')
      }
    }

    void checkAdminSession()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (sessionStatus !== 'unauthenticated') return
    navigate('/login', { replace: true, state: { from: '/admin' } })
  }, [navigate, sessionStatus])

  async function handleLogout() {
    setStatusMessage('')

    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      setStatusMessage('관리자 로그아웃 요청을 완료하지 못했습니다.')
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <AppLayout hideNavigation adminMode>
      <section className="admin-page page-container">
        <div className="admin-header">
          <div>
            <StatusBadge tone="neutral">관리자</StatusBadge>
            <h1>관리자 페이지</h1>
            <p>서비스 운영 현황과 추후 관리 기능이 이곳에 표시됩니다.</p>
          </div>
          {isAuthenticated && (
            <CommonButton type="button" variant="secondary" onClick={() => void handleLogout()}>
              관리자 로그아웃
            </CommonButton>
          )}
        </div>

        {isCheckingSession && (
          <article className="surface-card admin-auth-card" role="status">
            <StatusBadge tone="neutral">확인 중</StatusBadge>
            <h2>관리자 세션을 확인하고 있습니다.</h2>
            <p>잠시만 기다려주세요.</p>
          </article>
        )}

        {isAuthenticated && (
          <>
            <div className="admin-card-grid">
              <article className="surface-card admin-stat-card">
                <span>서비스 운영 현황</span>
                <strong>추후 관리 기능이 이곳에 표시됩니다.</strong>
              </article>
              <article className="surface-card admin-stat-card">
                <span>콘텐츠 관리</span>
                <strong>축제와 관광 데이터 관리 영역을 준비할 수 있습니다.</strong>
              </article>
              <article className="surface-card admin-stat-card">
                <span>접근 상태</span>
                <strong>관리자 세션 확인 완료</strong>
              </article>
            </div>
            <section className="surface-card admin-panel admin-next-panel">
              <h2>운영 대시보드</h2>
              <p>관리자 전용 데이터 API는 서버에서 관리자 쿠키를 검증한 뒤 연결해야 합니다.</p>
            </section>
          </>
        )}

        {statusMessage && (
          <p className="disabled-notice admin-status-message" role="status">
            {statusMessage}
          </p>
        )}
      </section>
    </AppLayout>
  )
}
