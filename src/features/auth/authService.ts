import type {
  AuthResult,
  AuthService,
  ForgotPasswordFormValues,
  LoginFormValues,
  SignupFormValues,
} from './authTypes'

export const authService: AuthService = {
  async login(values: LoginFormValues): Promise<AuthResult> {
    void values
    return { ok: false, message: 'Supabase Auth 연동 전입니다.' }
  },
  async signup(values: SignupFormValues): Promise<AuthResult> {
    void values
    return { ok: false, message: 'Supabase Auth 연동 전입니다.' }
  },
  async sendPasswordReset(values: ForgotPasswordFormValues): Promise<AuthResult> {
    void values
    return { ok: false, message: 'Supabase Auth 연동 전입니다.' }
  },
}
