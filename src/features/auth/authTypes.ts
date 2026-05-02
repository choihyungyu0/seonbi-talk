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
