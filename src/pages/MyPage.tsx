import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { ImagePlaceholder } from '../components/common/ImagePlaceholder'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { ResultCard } from '../components/result/ResultCard'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { getStoredAuthUser } from '../features/auth/authApi'
import {
  getFavoriteCourses,
  removeFavoriteCourse,
  type FavoriteCourse,
} from '../features/favorites/favoriteApi'
import { loadTestResult } from '../lib/storage'

export function MyPage() {
  const user = getStoredAuthUser()
  const testResult = loadTestResult()
  const [favorites, setFavorites] = useState<FavoriteCourse[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user) return

    let ignore = false

    async function loadFavorites() {
      setStatus('loading')
      setMessage('')

      try {
        const nextFavorites = await getFavoriteCourses()
        if (ignore) return

        setFavorites(nextFavorites)
        setStatus('idle')
      } catch {
        if (ignore) return
        setStatus('error')
        setMessage('저장한 관심 코스를 불러오지 못했습니다.')
      }
    }

    void loadFavorites()

    return () => {
      ignore = true
    }
  }, [user])

  if (!user) {
    return (
      <AppLayout>
        <section className="page-section page-container">
          <article className="surface-card empty-result-card protected-feature-card">
            <h1>로그인 후 마이페이지를 이용할 수 있습니다.</h1>
            <div className="page-actions center">
              <Link className="common-button common-button--primary" to="/login">
                로그인하기
              </Link>
              <Link className="common-button common-button--secondary" to="/signup">
                회원가입하기
              </Link>
            </div>
          </article>
        </section>
      </AppLayout>
    )
  }

  const typeInfo = testResult ? seonbiTypeInfo[testResult.type] : null

  async function handleRemoveFavorite(contentId: string) {
    setMessage('')

    try {
      await removeFavoriteCourse(contentId)
      setFavorites((current) =>
        current.filter((favorite) => favorite.content_id !== contentId),
      )
      setMessage('관심 코스에서 해제했습니다.')
    } catch {
      setMessage('관심 코스를 해제하지 못했습니다.')
    }
  }

  return (
    <AppLayout>
      <section className="page-section page-container mypage">
        <div className="section-heading">
          <StatusBadge>마이페이지</StatusBadge>
          <h1>{user.nickname || user.email || '나의 영주선비길'}</h1>
          <p>나의 선비유형과 저장한 영주 관심 코스를 확인합니다.</p>
        </div>

        <section className="mypage-section">
          <div className="mypage-section-heading">
            <h2>나의 선비유형</h2>
            <Link className="common-button common-button--secondary" to="/test">
              선비유형 테스트 시작하기
            </Link>
          </div>
          {testResult && typeInfo ? (
            <div className="mypage-result-card">
              <ResultCard typeInfo={typeInfo} result={testResult} />
            </div>
          ) : (
            <article className="surface-card mypage-empty-card">
              <p>아직 선비유형 테스트 결과가 없습니다.</p>
            </article>
          )}
        </section>

        <section className="mypage-section">
          <div className="mypage-section-heading">
            <h2>저장한 관심 코스</h2>
            <Link className="common-button common-button--primary" to="/course">
              추천 코스 보러가기
            </Link>
          </div>

          {status === 'loading' && (
            <article className="surface-card mypage-empty-card">
              <p>저장한 관심 코스를 불러오고 있습니다.</p>
            </article>
          )}

          {status === 'error' && (
            <p className="form-error" role="status">
              {message}
            </p>
          )}

          {status === 'idle' && favorites.length === 0 && (
            <article className="surface-card mypage-empty-card">
              <p>아직 저장한 관심 코스가 없습니다.</p>
            </article>
          )}

          {favorites.length > 0 && (
            <div className="mypage-favorite-grid">
              {favorites.map((favorite) => (
                <article className="surface-card mypage-favorite-card" key={favorite.content_id}>
                  {favorite.first_image ? (
                    <img src={favorite.first_image} alt="" />
                  ) : (
                    <ImagePlaceholder label="이미지 정보 없음" />
                  )}
                  <div>
                    <StatusBadge tone="brown">
                      {getContentTypeLabel(favorite.content_type_id)}
                    </StatusBadge>
                    <h3>{favorite.title ?? '관광지명 정보 없음'}</h3>
                    <p>{favorite.address ?? '주소 정보 없음'}</p>
                    <CommonButton
                      type="button"
                      variant="secondary"
                      onClick={() => void handleRemoveFavorite(favorite.content_id)}
                    >
                      저장 해제
                    </CommonButton>
                  </div>
                </article>
              ))}
            </div>
          )}

          {message && status !== 'error' && (
            <p className="disabled-notice mypage-notice" role="status">
              {message}
            </p>
          )}
        </section>
      </section>
    </AppLayout>
  )
}

function getContentTypeLabel(contentTypeId: string | undefined) {
  if (contentTypeId === '12') return '관광지'
  if (contentTypeId === '14') return '문화시설'
  if (contentTypeId === '32') return '숙박'
  if (contentTypeId === '39') return '음식점'
  return '관광 정보'
}
