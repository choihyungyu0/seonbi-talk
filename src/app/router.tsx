import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from '../pages/AdminPage'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { AuthCallbackPage } from '../pages/AuthCallbackPage'
import { CoursePage } from '../pages/CoursePage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { GoogleTour3DPreviewPage } from '../pages/GoogleTour3DPreviewPage'
import { HomePage } from '../pages/HomePage'
import { JudgePage } from '../pages/JudgePage'
import { LoginPage } from '../pages/LoginPage'
import { MyPage } from '../pages/MyPage'
import { ResultPage } from '../pages/ResultPage'
import { SignupPage } from '../pages/SignupPage'
import { TestPage } from '../pages/TestPage'
import { TourismHeatmapPage } from '../pages/TourismHeatmapPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/course" element={<CoursePage />} />
        <Route path="/heatmap" element={<TourismHeatmapPage />} />
        <Route path="/tour-3d" element={<GoogleTour3DPreviewPage />} />
        <Route path="/judge" element={<JudgePage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
