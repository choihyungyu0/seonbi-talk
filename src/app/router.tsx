import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminInsightPage } from '../pages/AdminInsightPage'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { CoursePage } from '../pages/CoursePage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { HomePage } from '../pages/HomePage'
import { JudgePage } from '../pages/JudgePage'
import { LoginPage } from '../pages/LoginPage'
import { ResultPage } from '../pages/ResultPage'
import { SignupPage } from '../pages/SignupPage'
import { TestPage } from '../pages/TestPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/course" element={<CoursePage />} />
        <Route path="/judge" element={<JudgePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminInsightPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
