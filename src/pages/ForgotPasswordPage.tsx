import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthButton } from '../components/auth/AuthButton'
import { TextField } from '../components/auth/TextField'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import type { ForgotPasswordFormValues } from '../features/auth/authTypes'
import { validateForgotPassword } from '../features/auth/authValidation'

export function ForgotPasswordPage() {
  const [values, setValues] = useState<ForgotPasswordFormValues>({ email: '' })
  const [errors, setErrors] = useState<
    Partial<Record<keyof ForgotPasswordFormValues, string>>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForgotPassword(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setIsSubmitting(true)
    window.setTimeout(() => {
      setIsSubmitting(false)
      setSuccess(true)
    }, 500)
  }

  return (
    <AppLayout>
      <section className="auth-page page-container">
        <div className="auth-intro">
          <StatusBadge>비밀번호 찾기</StatusBadge>
          <h1>비밀번호 재설정</h1>
          <p>계정 보호를 위해 계정 존재 여부는 화면에 표시하지 않습니다.</p>
        </div>
        <form className="surface-card auth-form" onSubmit={handleSubmit}>
          <TextField
            label="이메일"
            name="email"
            type="email"
            placeholder="example@email.com"
            value={values.email}
            error={errors.email}
            onChange={(event) => setValues({ email: event.target.value })}
          />
          <AuthButton isLoading={isSubmitting}>재설정 메일 보내기</AuthButton>
          {success && (
            <p className="success-message">
              입력하신 이메일로 재설정 안내를 보냈습니다.
            </p>
          )}
          <Link className="text-link" to="/login">
            로그인으로 돌아가기
          </Link>
        </form>
      </section>
    </AppLayout>
  )
}
