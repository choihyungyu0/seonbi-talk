import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthButton } from '../components/auth/AuthButton'
import { PasswordField } from '../components/auth/PasswordField'
import { TextField } from '../components/auth/TextField'
import { CommonButton } from '../components/common/CommonButton'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { signIn } from '../features/auth/authApi'
import type { LoginFormValues } from '../features/auth/authTypes'
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setStatusMessage('')

    try {
      await signIn(values.email.trim(), values.password)
      const redirectTo = getRedirectPath(location.state)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <section className="auth-page page-container">
        <div className="auth-intro">
          <StatusBadge>로그인</StatusBadge>
          <h1>나의 선비길을 이어서 확인해보세요</h1>
          <p>결과 저장, 관심 코스, 여행 기록은 로그인 후 이용할 수 있어요.</p>
        </div>
        <form className="surface-card auth-form" onSubmit={handleSubmit}>
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
          <AuthButton isLoading={isSubmitting}>로그인</AuthButton>
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
        </form>
      </section>
    </AppLayout>
  )
}

function getRedirectPath(state: unknown) {
  if (
    state &&
    typeof state === 'object' &&
    'from' in state &&
    typeof state.from === 'string'
  ) {
    return state.from
  }

  return '/'
}
