import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  SignupFormValues,
} from './authTypes'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string) {
  if (!email.trim()) return '이메일을 입력하세요.'
  if (!emailPattern.test(email)) return '올바른 이메일 형식으로 입력하세요.'
  return ''
}

export function validateLogin(values: LoginFormValues) {
  const errors: Partial<Record<keyof LoginFormValues, string>> = {}
  const emailError = validateEmail(values.email)
  if (emailError) errors.email = emailError
  if (!values.password) errors.password = '비밀번호를 입력하세요.'
  return errors
}

export function validateSignup(values: SignupFormValues) {
  const errors: Partial<Record<keyof SignupFormValues, string>> = {}
  const emailError = validateEmail(values.email)
  if (emailError) errors.email = emailError
  if (!values.password) errors.password = '비밀번호를 입력하세요.'
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.'
  }
  if (!values.nickname.trim()) errors.nickname = '닉네임을 입력하세요.'
  if (!values.agreeTerms) errors.agreeTerms = '이용약관 동의가 필요합니다.'
  if (!values.agreePrivacy) {
    errors.agreePrivacy = '개인정보처리방침 동의가 필요합니다.'
  }
  return errors
}

export function validateForgotPassword(values: ForgotPasswordFormValues) {
  const errors: Partial<Record<keyof ForgotPasswordFormValues, string>> = {}
  const emailError = validateEmail(values.email)
  if (emailError) errors.email = emailError
  return errors
}
