import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthButton } from '../components/auth/AuthButton'
import { FormErrorMessage } from '../components/auth/FormErrorMessage'
import { PasswordField } from '../components/auth/PasswordField'
import { TextField } from '../components/auth/TextField'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import type { SignupFormValues } from '../features/auth/authTypes'
import { validateSignup } from '../features/auth/authValidation'

const initialValues: SignupFormValues = {
  email: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  ageGroup: '',
  travelPurpose: '',
  agreeTerms: false,
  agreePrivacy: false,
  agreeOptionalAnalytics: false,
}

export function SignupPage() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<
    Partial<Record<keyof SignupFormValues, string>>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateSignup(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setIsSubmitting(true)
    window.setTimeout(() => setIsSubmitting(false), 500)
  }

  return (
    <AppLayout>
      <section className="auth-page page-container">
        <div className="auth-intro">
          <StatusBadge>회원가입</StatusBadge>
          <h1>나만의 선비여행 기록을 만들어보세요</h1>
          <p>실제 회원가입 API 호출은 다음 단계에서 연결합니다.</p>
        </div>
        <form className="surface-card auth-form wide" onSubmit={handleSubmit}>
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
          <TextField
            label="닉네임"
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
          <div className="optional-grid">
            <label className="field">
              <span>연령대 선택 항목</span>
              <select
                value={values.ageGroup}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    ageGroup: event.target.value,
                  }))
                }
              >
                <option value="">선택하지 않음</option>
                <option value="teen">10대</option>
                <option value="twenties">20대</option>
                <option value="thirties">30대</option>
                <option value="forties-plus">40대 이상</option>
              </select>
            </label>
            <label className="field">
              <span>여행 목적 선택 항목</span>
              <select
                value={values.travelPurpose}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    travelPurpose: event.target.value,
                  }))
                }
              >
                <option value="">선택하지 않음</option>
                <option value="culture">문화 탐방</option>
                <option value="rest">휴식</option>
                <option value="family">동행 여행</option>
              </select>
            </label>
          </div>
          <fieldset className="terms-fieldset">
            <legend>약관 동의</legend>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={values.agreeTerms}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    agreeTerms: event.target.checked,
                  }))
                }
              />
              이용약관 동의 필수
            </label>
            <FormErrorMessage message={errors.agreeTerms} />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={values.agreePrivacy}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    agreePrivacy: event.target.checked,
                  }))
                }
              />
              개인정보처리방침 동의 필수
            </label>
            <FormErrorMessage message={errors.agreePrivacy} />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={values.agreeOptionalAnalytics}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    agreeOptionalAnalytics: event.target.checked,
                  }))
                }
              />
              관광 추천 및 통계 분석을 위한 선택 정보 활용 동의 선택
            </label>
          </fieldset>
          <AuthButton isLoading={isSubmitting}>회원가입하기</AuthButton>
          <p className="auth-helper">
            이미 계정이 있다면 <Link to="/login">로그인</Link>
          </p>
        </form>
      </section>
    </AppLayout>
  )
}
