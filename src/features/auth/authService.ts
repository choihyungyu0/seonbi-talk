import type {
  AuthResult,
  AuthService,
  ForgotPasswordFormValues,
  LoginFormValues,
  OAuthProvider,
  SignupFormValues,
} from './authTypes'
import { signIn, signInWithOAuthProvider, signUp } from './authApi'

export const authService: AuthService = {
  async login(values: LoginFormValues): Promise<AuthResult> {
    try {
      await signIn(values.email.trim(), values.password)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : '로그인 중 문제가 발생했습니다.',
      }
    }
  },
  async signup(values: SignupFormValues): Promise<AuthResult> {
    try {
      await signUp(values.email.trim(), values.password, values.nickname)
      return { ok: true, message: '이메일 인증 후 로그인해주세요.' }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : '회원가입 중 문제가 발생했습니다.',
      }
    }
  },
  async socialLogin(
    provider: OAuthProvider,
    returnTo?: string,
  ): Promise<AuthResult> {
    try {
      signInWithOAuthProvider(provider, returnTo)
      return { ok: true }
    } catch {
      return {
        ok: false,
        message: '간편로그인으로 이동하지 못했습니다.',
      }
    }
  },
  async sendPasswordReset(values: ForgotPasswordFormValues): Promise<AuthResult> {
    void values
    return { ok: false, message: 'Supabase Auth 연동 전입니다.' }
  },
}
