import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AdminPage } from '../pages/AdminPage'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { AuthCallbackPage } from '../pages/AuthCallbackPage'
import { BrandLoading } from '../components/common/BrandLoading'
import { CoursePage } from '../pages/CoursePage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { GoogleTour3DPreviewPage } from '../pages/GoogleTour3DPreviewPage'
import { HomeLandingPage } from '../pages/HomeLandingPage'
import { JudgePage } from '../pages/JudgePage'
import { KnowledgeGraphPage } from '../pages/KnowledgeGraphPage'
import { LoginPage } from '../pages/LoginPage'
import { MissionCompletePage } from '../pages/MissionCompletePage'
import { MissionReflectionPage } from '../pages/MissionReflectionPage'
import { MyPage } from '../pages/MyPage'
import { ResultPage } from '../pages/ResultPage'
import { SignupPage } from '../pages/SignupPage'
import { TestPage } from '../pages/TestPage'

const TourismHeatmapPage = lazy(() =>
  import('../pages/TourismHeatmapPage').then((module) => ({
    default: module.TourismHeatmapPage,
  })),
)

function GoogleTour3DRoute() {
  const location = useLocation()

  return <GoogleTour3DPreviewPage key={location.search} />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeLandingPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/test/result" element={<ResultPage />} />
        <Route path="/test/result/:type" element={<ResultPage />} />
        <Route path="/result" element={<Navigate to="/test/result" replace />} />
        <Route path="/course" element={<CoursePage />} />
        <Route
          path="/heatmap"
          element={
            <Suspense fallback={<BrandLoading message="관광 데이터 레이어를 준비하는 중입니다." />}>
              <TourismHeatmapPage />
            </Suspense>
          }
        />
        <Route path="/tour-3d" element={<GoogleTour3DRoute />} />
        <Route path="/mission-complete" element={<MissionCompletePage />} />
        <Route path="/mission-complete/:placeId" element={<MissionReflectionPage />} />
        <Route path="/ai-evidence-graph" element={<KnowledgeGraphPage />} />
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
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
