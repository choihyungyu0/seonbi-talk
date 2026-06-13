import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthButton } from '../components/auth/AuthButton'
import { FormErrorMessage } from '../components/auth/FormErrorMessage'
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

const loginAssets = {
  book: '/images/image-Photoroom%20(6).png',
  map: '/images/image-Photoroom%20(7).png',
  scroll: '/images/image-Photoroom%20(8).png',
  mail: '/images/image-Photoroom%20(4).png',
  lock: '/images/image-Photoroom%20(3).png',
  shield: '/images/image-Photoroom%20(9).png',
}

const loginBenefits = [
  { label: '결과 저장', image: loginAssets.book },
  { label: '관심 코스', image: loginAssets.map },
  { label: '여행 기록', image: loginAssets.scroll },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({})
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [socialProvider, setSocialProvider] = useState<OAuthProvider | null>(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
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
    <AppLayout className="app-shell--login" hideChatbot hideBottomNavigation>
      <section className="login-page" aria-labelledby="login-page-title">
        <div className="login-page-shell page-container">
          <div className="auth-intro login-hero-panel">
            <StatusBadge>로그인</StatusBadge>
            <h1 id="login-page-title">
              <span>나의 선비길을 이어서</span>
              <strong>확인해보세요</strong>
            </h1>
            <p>결과 저장, 관심 코스, 여행 기록은 로그인 후 이용할 수 있어요.</p>
            <div className="login-hero-divider" aria-hidden="true">
              <span />
              <strong>✤</strong>
              <span />
            </div>
            <div className="login-benefit-list" aria-label="로그인 후 이용 가능한 기능">
              {loginBenefits.map((benefit) => (
                <figure className="login-benefit-item" key={benefit.label}>
                  <span
                    className="login-benefit-art"
                    style={{ backgroundImage: `url("${benefit.image}")` }}
                    aria-hidden="true"
                  />
                  <figcaption>{benefit.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
          <form className="surface-card auth-form login-form" onSubmit={handleSubmit}>
          <div className="login-form-ornament" aria-hidden="true" />
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
                <span
                  className="social-login-icon social-login-icon--google"
                  aria-hidden="true"
                />
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
                <span
                  className="social-login-icon social-login-icon--kakao"
                  aria-hidden="true"
                />
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
          <div className="field login-field">
            <label htmlFor="login-email">이메일</label>
            <div className="login-input-frame">
              <span
                className="login-input-icon login-input-icon--mail"
                aria-hidden="true"
              />
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={values.email}
                aria-invalid={Boolean(errors.email)}
                onChange={(event) =>
                  setValues((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <FormErrorMessage message={errors.email} />
          </div>
          <div className="field login-field">
            <label htmlFor="login-password">비밀번호</label>
            <div className="password-field login-password-frame">
              <div className="login-input-frame">
                <span
                  className="login-input-icon login-input-icon--lock"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  name="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={values.password}
                  aria-invalid={Boolean(errors.password)}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </div>
              <CommonButton
                type="button"
                variant="ghost"
                className="password-toggle"
                aria-pressed={isPasswordVisible}
                onClick={() => setIsPasswordVisible((visible) => !visible)}
              >
                {isPasswordVisible ? '숨기기' : '보기'}
              </CommonButton>
            </div>
            <FormErrorMessage message={errors.password} />
          </div>
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
            <span className="login-submit-icon" aria-hidden="true" />
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
            <div className="admin-code-panel">
              <img
                className="admin-code-emblem"
                src={loginAssets.shield}
                alt=""
                aria-hidden="true"
              />
              <div className="admin-code-copy">
                <h2 id="admin-code-title">관리자 코드</h2>
                <p>관리자 권한이 있는 경우 코드를 입력해 관리자 페이지로 이동할 수 있습니다.</p>
              </div>
              <div className="admin-code-control">
                <label className="field admin-code-field" htmlFor="admin-code">
                  <span className="visually-hidden">관리자 코드</span>
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
            </div>
          </div>
        </form>
        </div>
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
