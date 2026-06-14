import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthButton } from '../components/auth/AuthButton'
import { FormErrorMessage } from '../components/auth/FormErrorMessage'
import { CommonButton } from '../components/common/CommonButton'
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

const signupAssets = {
  email: '/images/1%20(2).png',
  user: '/images/2%20(2).png',
  lock: '/images/3%20(2).png',
  shield: '/images/4%20(2).png',
  book: '/images/image-Photoroom%20(6).png',
  map: '/images/image-Photoroom%20(7).png',
  scroll: '/images/image-Photoroom%20(8).png',
}

const signupBenefits = [
  { label: '닉네임 설정', image: signupAssets.scroll },
  { label: '기록 저장', image: signupAssets.book },
  { label: '관심 코스', image: signupAssets.map },
]

type SignupTermsKey = 'service' | 'privacy' | 'recommendation'

const initialTerms: Record<SignupTermsKey, boolean> = {
  service: false,
  privacy: false,
  recommendation: false,
}

const termsPreview: Record<SignupTermsKey, string> = {
  service: '서비스 이용에 필요한 계정 생성, 로그인, 여행 기록 저장 기능 제공을 위한 약관입니다.',
  privacy: '이메일, 닉네임 등 회원 식별과 계정 관리를 위한 최소 정보를 수집하고 이용합니다.',
  recommendation: '관심 코스와 여행 기록을 바탕으로 코스 추천과 안내를 더 잘 맞추기 위한 선택 동의입니다.',
}

export function SignupPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<
    Partial<Record<keyof SignupFormValues, string>>
  >({})
  const [terms, setTerms] = useState(initialTerms)
  const [termsError, setTermsError] = useState('')
  const [openTermsPreview, setOpenTermsPreview] = useState<SignupTermsKey | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)

  const hasRequiredTerms = terms.service && terms.privacy
  const hasAllTerms = hasRequiredTerms && terms.recommendation

  function updateTerm(name: SignupTermsKey, checked: boolean) {
    setTerms((current) => {
      const nextTerms = { ...current, [name]: checked }
      if (nextTerms.service && nextTerms.privacy) {
        setTermsError('')
      }
      return nextTerms
    })
  }

  function updateAllTerms(checked: boolean) {
    setTerms({
      service: checked,
      privacy: checked,
      recommendation: checked,
    })
    if (checked) {
      setTermsError('')
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateSignup(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!hasRequiredTerms) {
      setTermsError('필수 약관에 동의해야 회원가입을 진행할 수 있어요.')
      return
    }

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
    <AppLayout
      className="app-shell--login app-shell--signup"
      hideChatbot
      hideBottomNavigation
    >
      <section className="signup-page" aria-labelledby="signup-page-title">
        <div className="signup-page-shell page-container">
          <div className="auth-intro login-hero-panel signup-hero-panel">
            <StatusBadge>회원가입</StatusBadge>
            <h1 id="signup-page-title">
              <span>
                <em>나만의</em> 선비여행
              </span>
              <span>
                <em>기록</em>을 만들어보세요
              </span>
            </h1>
            <p>이메일과 비밀번호로 계정을 만들고 여행 기록을 이어갈 수 있어요.</p>
            <div className="login-hero-divider signup-hero-divider" aria-hidden="true">
              <span />
              <strong>✤</strong>
              <span />
            </div>
            <div
              className="signup-benefit-list login-benefit-list"
              aria-label="회원가입 후 이용 가능한 기능"
            >
              {signupBenefits.map((benefit) => (
                <figure
                  className="login-benefit-item signup-benefit-item"
                  key={benefit.label}
                >
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
          <form
            className="surface-card auth-form login-form signup-form"
            onSubmit={handleSubmit}
          >
            <div
              className="login-form-ornament signup-form-ornament"
              aria-hidden="true"
            />
            <div className="signup-form-heading">
              <span>회원 정보 입력</span>
            </div>
            <div className="field login-field signup-field">
              <label htmlFor="signup-nickname">닉네임 선택</label>
              <div className="login-input-frame signup-input-frame">
                <span
                  className="login-input-icon signup-input-icon"
                  aria-hidden="true"
                >
                  <img src={signupAssets.user} alt="" />
                </span>
                <input
                  id="signup-nickname"
                  name="nickname"
                  placeholder="닉네임을 입력하세요"
                  value={values.nickname}
                  aria-invalid={Boolean(errors.nickname)}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      nickname: event.target.value,
                    }))
                  }
                />
              </div>
              <FormErrorMessage message={errors.nickname} />
            </div>
            <div className="field login-field signup-field">
              <label htmlFor="signup-email">이메일</label>
              <div className="login-input-frame signup-input-frame">
                <span
                  className="login-input-icon signup-input-icon"
                  aria-hidden="true"
                >
                  <img src={signupAssets.email} alt="" />
                </span>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={values.email}
                  aria-invalid={Boolean(errors.email)}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
              <FormErrorMessage message={errors.email} />
            </div>
            <div className="field login-field signup-field">
              <label htmlFor="signup-password">비밀번호</label>
              <div className="password-field login-password-frame signup-password-frame">
                <div className="login-input-frame signup-input-frame">
                  <span
                    className="login-input-icon signup-input-icon"
                    aria-hidden="true"
                  >
                    <img src={signupAssets.lock} alt="" />
                  </span>
                  <input
                  id="signup-password"
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
            <div className="field login-field signup-field">
              <label htmlFor="signup-confirm-password">비밀번호 확인</label>
              <div className="password-field login-password-frame signup-password-frame">
                <div className="login-input-frame signup-input-frame">
                  <span
                    className="login-input-icon signup-input-icon"
                    aria-hidden="true"
                  >
                    <img src={signupAssets.shield} alt="" />
                  </span>
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    value={values.confirmPassword}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />
                </div>
                <CommonButton
                  type="button"
                  variant="ghost"
                  className="password-toggle"
                  aria-pressed={isConfirmPasswordVisible}
                  onClick={() => setIsConfirmPasswordVisible((visible) => !visible)}
                >
                  {isConfirmPasswordVisible ? '숨기기' : '보기'}
                </CommonButton>
              </div>
              <FormErrorMessage message={errors.confirmPassword} />
            </div>
            {statusMessage && (
              <p className="disabled-notice signup-status-message" role="status">
                {statusMessage}
              </p>
            )}
            <section className="signup-terms-section" aria-labelledby="signup-terms-title">
              <div className="signup-terms-header">
                <label className="signup-terms-check signup-terms-check--all">
                  <input
                    type="checkbox"
                    checked={hasAllTerms}
                    onChange={(event) => updateAllTerms(event.target.checked)}
                  />
                  <span>
                    <strong id="signup-terms-title">약관 전체 동의</strong>
                    <small>필수 항목 동의 후 회원가입을 진행할 수 있어요.</small>
                  </span>
                </label>
              </div>
              <div className="signup-terms-list">
                {([
                  ['service', '[필수] 서비스 이용약관 동의'],
                  ['privacy', '[필수] 개인정보 수집·이용 동의'],
                  ['recommendation', '[선택] 여행 추천 및 알림 수신 동의'],
                ] as const).map(([name, label]) => (
                  <div className="signup-terms-item" key={name}>
                    <label className="signup-terms-check">
                      <input
                        type="checkbox"
                        checked={terms[name]}
                        onChange={(event) => updateTerm(name, event.target.checked)}
                      />
                      <span>{label}</span>
                    </label>
                    <button
                      className="signup-terms-view"
                      type="button"
                      aria-expanded={openTermsPreview === name}
                      onClick={() =>
                        setOpenTermsPreview((current) =>
                          current === name ? null : name,
                        )
                      }
                    >
                      보기
                    </button>
                  </div>
                ))}
              </div>
              {openTermsPreview && (
                <p className="signup-terms-preview">
                  {termsPreview[openTermsPreview]}
                </p>
              )}
              {termsError && (
                <p className="form-error signup-terms-error" role="alert">
                  {termsError}
                </p>
              )}
            </section>
            <AuthButton isLoading={isSubmitting}>회원가입하기</AuthButton>
            <p className="auth-helper">
              이미 계정이 있다면 <Link to="/login">로그인</Link>
            </p>
            <p className="signup-secure-note">
              <img src={signupAssets.shield} alt="" aria-hidden="true" />
              소중한 정보를 안전하게 보호합니다.
            </p>
          </form>
        </div>
      </section>
    </AppLayout>
  )
}
