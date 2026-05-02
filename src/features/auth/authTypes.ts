export interface LoginFormValues {
  email: string
  password: string
  rememberMe: boolean
}

export interface SignupFormValues {
  email: string
  password: string
  confirmPassword: string
  nickname: string
  ageGroup: string
  travelPurpose: string
  agreeTerms: boolean
  agreePrivacy: boolean
  agreeOptionalAnalytics: boolean
}

export interface ForgotPasswordFormValues {
  email: string
}

export interface AuthResult {
  ok: boolean
  message?: string
}

export interface AuthService {
  login(values: LoginFormValues): Promise<AuthResult>
  signup(values: SignupFormValues): Promise<AuthResult>
  sendPasswordReset(values: ForgotPasswordFormValues): Promise<AuthResult>
}
