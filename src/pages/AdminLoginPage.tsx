import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthButton } from '../components/auth/AuthButton'
import { PasswordField } from '../components/auth/PasswordField'
import { TextField } from '../components/auth/TextField'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import type { LoginFormValues } from '../features/auth/authTypes'
import { validateLogin } from '../features/auth/authValidation'

export function AdminLoginPage() {
  const [values, setValues] = useState<LoginFormValues>({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setIsSubmitting(true)
    window.setTimeout(() => setIsSubmitting(false), 500)
  }

  return (
    <AppLayout hideNavigation adminMode>
      <section className="admin-login-page">
        <Link className="text-link back-link" to="/">
          일반 서비스로 돌아가기
        </Link>
        <form className="surface-card auth-form admin-form" onSubmit={handleSubmit}>
          <StatusBadge tone="neutral">관리자</StatusBadge>
          <h1>관리자 인사이트 로그인</h1>
          <p>영주선비길 이용 현황과 관광 선호 데이터를 확인합니다.</p>
          <TextField
            label="관리자 이메일"
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
          <AuthButton isLoading={isSubmitting}>관리자 로그인</AuthButton>
          <p className="disabled-notice">
            관리자 권한이 있는 계정만 접근할 수 있습니다.
          </p>
        </form>
      </section>
    </AppLayout>
  )
}
