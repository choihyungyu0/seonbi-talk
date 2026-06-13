import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthButton } from '../components/auth/AuthButton'
import { PasswordField } from '../components/auth/PasswordField'
import { TextField } from '../components/auth/TextField'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { signUp } from '../features/auth/authApi'
import type { SignupFormValues } from '../features/auth/authTypes'
import { validateSignup } from '../features/auth/authValidation'

const initialValues: SignupFormValues = {
  email: '',
  password: '',
  confirmPassword: '',
  nickname: '',
}

export function SignupPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<
    Partial<Record<keyof SignupFormValues, string>>
  >({})
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateSignup(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setStatusMessage('')

    try {
      const result = await signUp(values.email.trim(), values.password, values.nickname)
      setStatusMessage(
        result.requiresEmailConfirmation
          ? '이메일 인증 후 로그인해주세요.'
          : '회원가입이 완료되었습니다.',
      )
      window.setTimeout(
        () => navigate(result.requiresEmailConfirmation ? '/login' : '/mypage'),
        900,
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : '회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout hideChatbot hideBottomNavigation>
      <section className="auth-page page-container">
        <div className="auth-intro">
          <StatusBadge>회원가입</StatusBadge>
          <h1>나만의 선비여행 기록을 만들어보세요</h1>
          <p>이메일과 비밀번호로 계정을 만들고 여행 기록을 이어갈 수 있어요.</p>
        </div>
        <form className="surface-card auth-form" onSubmit={handleSubmit}>
          <TextField
            label="닉네임 선택"
            name="nickname"
            value={values.nickname}
            error={errors.nickname}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                nickname: event.target.value,
              }))
            }
          />
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
          <PasswordField
            label="비밀번호 확인"
            name="confirmPassword"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
          />
          {statusMessage && (
            <p className="disabled-notice" role="status">
              {statusMessage}
            </p>
          )}
          <AuthButton isLoading={isSubmitting}>회원가입하기</AuthButton>
          <p className="auth-helper">
            이미 계정이 있다면 <Link to="/login">로그인</Link>
          </p>
        </form>
      </section>
    </AppLayout>
  )
}
