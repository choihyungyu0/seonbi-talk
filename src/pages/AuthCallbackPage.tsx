import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import {
  completeOAuthSignInFromUrl,
  consumeOAuthReturnTo,
} from '../features/auth/authApi'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function completeSignIn() {
      try {
        await completeOAuthSignInFromUrl()
        const returnTo = consumeOAuthReturnTo()
        navigate(returnTo ?? '/mypage', { replace: true })
      } catch {
        consumeOAuthReturnTo()
        if (isMounted) {
          setErrorMessage(
            '간편로그인 처리 중 문제가 발생했습니다. 다시 로그인해주세요.',
          )
        }
      }
    }

    void completeSignIn()

    return () => {
      isMounted = false
    }
  }, [navigate])

  return (
    <AppLayout hideChatbot hideBottomNavigation>
      <section className="auth-page page-container">
        <div className="auth-intro">
          <h1>간편로그인을 확인하고 있습니다</h1>
          <p>인증이 완료되면 앱으로 자동 이동합니다.</p>
        </div>
        <div className="surface-card auth-form" role="status">
          {errorMessage ? (
            <>
              <p className="form-error">{errorMessage}</p>
              <Link
                className="common-button common-button--primary common-button--full"
                to="/login"
              >
                로그인으로 돌아가기
              </Link>
            </>
          ) : (
            <p className="disabled-notice">세션을 저장하고 있습니다...</p>
          )}
        </div>
      </section>
    </AppLayout>
  )
}
