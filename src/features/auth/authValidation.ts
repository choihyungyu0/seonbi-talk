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
  if (values.password && values.password.length < 6) {
    errors.password = '비밀번호는 6자 이상이어야 합니다.'
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.'
  }
  return errors
}

export function validateForgotPassword(values: ForgotPasswordFormValues) {
  const errors: Partial<Record<keyof ForgotPasswordFormValues, string>> = {}
  const emailError = validateEmail(values.email)
  if (emailError) errors.email = emailError
  return errors
}
