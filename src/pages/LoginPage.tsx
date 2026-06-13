import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthButton } from '../components/auth/AuthButton'
import { PasswordField } from '../components/auth/PasswordField'
import { TextField } from '../components/auth/TextField'
import { CommonButton } from '../components/common/CommonButton'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { authService } from '../features/auth/authService'
import type { LoginFormValues, OAuthProvider } from '../features/auth/authTypes'
import { validateLogin } from '../features/auth/authValidation'

const initialValues: LoginFormValues = {
  email: '',
  password: '',
  rememberMe: false,
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({})
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [socialProvider, setSocialProvider] = useState<OAuthProvider | null>(null)
  const [adminCode, setAdminCode] = useState('')
  const [adminStatusMessage, setAdminStatusMessage] = useState('')
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setStatusMessage('')

    const result = await authService.login(values)
    if (result.ok) {
      navigate(getRedirectPath(location.state), { replace: true })
    } else {
      setStatusMessage(result.message ?? '로그인 중 문제가 발생했습니다.')
      setIsSubmitting(false)
    }
  }

  async function handleSocialLogin(provider: OAuthProvider) {
    setStatusMessage('')
    setSocialProvider(provider)

    const result = await authService.socialLogin(
      provider,
      getRedirectPath(location.state, '/mypage'),
    )

    if (!result.ok) {
      setStatusMessage(result.message ?? '간편로그인으로 이동하지 못했습니다.')
      setSocialProvider(null)
    }
  }

  async function handleAdminSubmit() {
    setAdminStatusMessage('')

    if (!adminCode.trim()) {
      setAdminStatusMessage('관리자 코드를 입력해주세요.')
      return
    }

    setIsAdminSubmitting(true)

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: adminCode }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
      }

      if (!response.ok || !data.ok) {
        setAdminStatusMessage(data.message ?? '관리자 코드가 올바르지 않습니다.')
        return
      }

      setAdminCode('')
      navigate('/admin', { replace: true })
    } catch {
      setAdminStatusMessage('관리자 코드 확인 중 문제가 발생했습니다.')
    } finally {
      setIsAdminSubmitting(false)
    }
  }

  return (
    <AppLayout hideChatbot hideBottomNavigation>
      <section className="auth-page page-container">
        <div className="auth-intro">
          <StatusBadge>로그인</StatusBadge>
          <h1>나의 선비길을 이어서 확인해보세요</h1>
          <p>결과 저장, 관심 코스, 여행 기록은 로그인 후 이용할 수 있어요.</p>
        </div>
        <form className="surface-card auth-form" onSubmit={handleSubmit}>
          <div className="social-login-section" aria-labelledby="social-login-title">
            <div className="social-login-heading">
              <span id="social-login-title">간편로그인</span>
            </div>
            <div className="social-login-actions">
              <button
                className="social-login-button social-login-button--google"
                type="button"
                disabled={Boolean(socialProvider) || isSubmitting}
                onClick={() => void handleSocialLogin('google')}
              >
                <span aria-hidden="true">G</span>
                {socialProvider === 'google'
                  ? 'Google로 이동 중...'
                  : 'Google로 계속하기'}
              </button>
              <button
                className="social-login-button social-login-button--kakao"
                type="button"
                disabled={Boolean(socialProvider) || isSubmitting}
                onClick={() => void handleSocialLogin('kakao')}
              >
                <span aria-hidden="true">K</span>
                {socialProvider === 'kakao'
                  ? 'Kakao로 이동 중...'
                  : 'Kakao로 계속하기'}
              </button>
            </div>
          </div>
          <div className="admin-code-divider" aria-hidden="true">
            <span />
            <strong>또는 이메일 로그인</strong>
            <span />
          </div>
          <TextField
            label="이메일"
            name="email"
            type="email"
            placeholder="example@email.com"
            value={values.email}
            error={errors.email}
            onChange={(event) =>
              setValues((current) => ({ ...current, email: event.target.value }))
            }
          />
          <PasswordField
            label="비밀번호"
            name="password"
            value={values.password}
            error={errors.password}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={values.rememberMe}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  rememberMe: event.target.checked,
                }))
              }
            />
            로그인 상태 유지
          </label>
          {statusMessage && (
            <p className="form-error" role="status">
              {statusMessage}
            </p>
          )}
          <AuthButton isLoading={isSubmitting} disabled={Boolean(socialProvider)}>
            로그인
          </AuthButton>
          <div className="auth-links">
            <Link to="/forgot-password">비밀번호 찾기</Link>
            <Link to="/signup">회원가입</Link>
          </div>
          <CommonButton
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => navigate('/')}
          >
            로그인 없이 둘러보기
          </CommonButton>

          <div className="admin-code-section" aria-labelledby="admin-code-title">
            <div className="admin-code-divider" aria-hidden="true">
              <span />
              <strong>또는</strong>
              <span />
            </div>
            <div className="admin-code-copy">
              <h2 id="admin-code-title">관리자 코드</h2>
              <p>관리자 권한이 있는 경우 코드를 입력해 관리자 페이지로 이동할 수 있습니다.</p>
            </div>
            <label className="field admin-code-field" htmlFor="admin-code">
              <span>관리자 코드</span>
              <input
                id="admin-code"
                type="password"
                placeholder="관리자 코드를 입력하세요"
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleAdminSubmit()
                  }
                }}
                autoComplete="off"
              />
              <p className="admin-code-hint">관리자코드 seonbi-admin-2026 입력</p>
            </label>
            {adminStatusMessage && (
              <p className="form-error" role="status">
                {adminStatusMessage}
              </p>
            )}
            <CommonButton
              type="button"
              variant="secondary"
              fullWidth
              disabled={isAdminSubmitting}
              isLoading={isAdminSubmitting}
              loadingLabel="관리자 코드를 확인하고 있습니다..."
              onClick={() => void handleAdminSubmit()}
            >
              관리자 페이지 입장
            </CommonButton>
          </div>
        </form>
      </section>
    </AppLayout>
  )
}

function getRedirectPath(state: unknown, fallback = '/') {
  if (
    state &&
    typeof state === 'object' &&
    'from' in state &&
    typeof state.from === 'string'
  ) {
    return state.from
  }

  return fallback
}
