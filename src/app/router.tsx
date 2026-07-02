import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BrandLoading } from '../components/common/BrandLoading'
import { HomeLandingPage } from '../pages/HomeLandingPage'

const AdminPage = lazy(() =>
  import('../pages/AdminPage').then((module) => ({ default: module.AdminPage })),
)
const AdminLoginPage = lazy(() =>
  import('../pages/AdminLoginPage').then((module) => ({
    default: module.AdminLoginPage,
  })),
)
const AuthCallbackPage = lazy(() =>
  import('../pages/AuthCallbackPage').then((module) => ({
    default: module.AuthCallbackPage,
  })),
)
const CoursePage = lazy(() =>
  import('../pages/CoursePage').then((module) => ({ default: module.CoursePage })),
)
const ForgotPasswordPage = lazy(() =>
  import('../pages/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const GoogleTour3DPreviewPage = lazy(() =>
  import('../pages/GoogleTour3DPreviewPage').then((module) => ({
    default: module.GoogleTour3DPreviewPage,
  })),
)
const JudgePage = lazy(() =>
  import('../pages/JudgePage').then((module) => ({ default: module.JudgePage })),
)
const KnowledgeGraphPage = lazy(() =>
  import('../pages/KnowledgeGraphPage').then((module) => ({
    default: module.KnowledgeGraphPage,
  })),
)
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const MissionCompletePage = lazy(() =>
  import('../pages/MissionCompletePage').then((module) => ({
    default: module.MissionCompletePage,
  })),
)
const MissionReflectionPage = lazy(() =>
  import('../pages/MissionReflectionPage').then((module) => ({
    default: module.MissionReflectionPage,
  })),
)
const MissionRewardPage = lazy(() =>
  import('../pages/MissionRewardPage').then((module) => ({
    default: module.MissionRewardPage,
  })),
)
const MyEarnedBadgesPage = lazy(() =>
  import('../pages/MyEarnedBadgesPage').then((module) => ({
    default: module.MyEarnedBadgesPage,
  })),
)
const MyOneLineArchivePage = lazy(() =>
  import('../pages/MyOneLineArchivePage').then((module) => ({
    default: module.MyOneLineArchivePage,
  })),
)
const MySavedCoursesPage = lazy(() =>
  import('../pages/MySavedCoursesScreen').then((module) => ({
    default: module.MyPage,
  })),
)
const MySeonbiRecordsPage = lazy(() =>
  import('../pages/MySeonbiRecordsPage').then((module) => ({
    default: module.MyPage,
  })),
)
const ResultPage = lazy(() =>
  import('../pages/ResultPage').then((module) => ({ default: module.ResultPage })),
)
const SignupPage = lazy(() =>
  import('../pages/SignupPage').then((module) => ({ default: module.SignupPage })),
)
const TestPage = lazy(() =>
  import('../pages/TestPage').then((module) => ({ default: module.TestPage })),
)

const TourismHeatmapPage = lazy(() =>
  import('../pages/TourismHeatmapPage').then((module) => ({
    default: module.TourismHeatmapPage,
  })),
)

function GoogleTour3DRoute() {
  const location = useLocation()

  return (
    <PageLoader>
      <GoogleTour3DPreviewPage key={location.search} />
    </PageLoader>
  )
}

function PageLoader({
  children,
  message = '화면을 준비하는 중입니다.',
}: {
  children: ReactNode
  message?: string
}) {
  return <Suspense fallback={<BrandLoading message={message} />}>{children}</Suspense>
}

function withPageLoader(children: ReactNode) {
  return <PageLoader>{children}</PageLoader>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeLandingPage />} />
        <Route path="/test" element={withPageLoader(<TestPage />)} />
        <Route path="/test/result" element={withPageLoader(<ResultPage />)} />
        <Route path="/test/result/:type" element={withPageLoader(<ResultPage />)} />
        <Route path="/result" element={<Navigate to="/test/result" replace />} />
        <Route path="/course" element={withPageLoader(<CoursePage />)} />
        <Route
          path="/heatmap"
          element={
            <Suspense fallback={<BrandLoading message="관광 데이터 레이어를 준비하는 중입니다." />}>
              <TourismHeatmapPage />
            </Suspense>
          }
        />
        <Route path="/tour-3d" element={<GoogleTour3DRoute />} />
        <Route path="/mission-complete" element={withPageLoader(<MissionCompletePage />)} />
        <Route path="/mission-reward" element={withPageLoader(<MissionRewardPage />)} />
        <Route
          path="/mission-complete/:placeId"
          element={withPageLoader(<MissionReflectionPage />)}
        />
        <Route path="/ai-evidence-graph" element={withPageLoader(<KnowledgeGraphPage />)} />
        <Route path="/knowledge-graph" element={withPageLoader(<KnowledgeGraphPage />)} />
        <Route path="/judge" element={withPageLoader(<JudgePage />)} />
        <Route path="/mypage" element={<Navigate to="/mypage/records" replace />} />
        <Route path="/mypage/records" element={withPageLoader(<MySeonbiRecordsPage />)} />
        <Route path="/mypage/one-line" element={withPageLoader(<MyOneLineArchivePage />)} />
        <Route path="/mypage/badges" element={withPageLoader(<MyEarnedBadgesPage />)} />
        <Route path="/mypage/saved-courses" element={withPageLoader(<MySavedCoursesPage />)} />
        <Route path="/login" element={withPageLoader(<LoginPage />)} />
        <Route path="/auth/callback" element={withPageLoader(<AuthCallbackPage />)} />
        <Route path="/signup" element={withPageLoader(<SignupPage />)} />
        <Route path="/forgot-password" element={withPageLoader(<ForgotPasswordPage />)} />
        <Route path="/admin-login" element={withPageLoader(<AdminLoginPage />)} />
        <Route path="/admin" element={withPageLoader(<AdminPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
