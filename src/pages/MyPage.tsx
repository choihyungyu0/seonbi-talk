import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { ImagePlaceholder } from '../components/common/ImagePlaceholder'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { ResultCard } from '../components/result/ResultCard'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import {
  getStoredAuthUser,
  onAuthStateChange,
  type AuthUser,
} from '../features/auth/authApi'
import {
  getFavoriteCourses,
  removeFavoriteCourse,
  type FavoriteCourse,
} from '../features/favorites/favoriteApi'
import {
  deleteJudgeHistory,
  getRecentJudgeHistories,
  type JudgeHistory,
} from '../features/judge/judgeHistoryApi'
import { loadTestResult } from '../lib/storage'

export function MyPage() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser())
  const testResult = loadTestResult()
  const [favorites, setFavorites] = useState<FavoriteCourse[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [judgeHistories, setJudgeHistories] = useState<JudgeHistory[]>([])
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  )
  const [historyMessage, setHistoryMessage] = useState('')
  const userId = user?.id

  useEffect(() => onAuthStateChange(setUser), [])

  useEffect(() => {
    if (!userId) return

    let ignore = false

    async function loadMyPageData() {
      setStatus('loading')
      setHistoryStatus('loading')
      setMessage('')
      setHistoryMessage('')

      const [favoriteResult, historyResult] = await Promise.allSettled([
        getFavoriteCourses(),
        getRecentJudgeHistories(5),
      ])
      if (ignore) return

      if (favoriteResult.status === 'fulfilled') {
        setFavorites(favoriteResult.value)
        setStatus('idle')
      } else {
        setStatus('error')
        setMessage('저장한 관심 코스를 불러오지 못했습니다.')
      }

      if (historyResult.status === 'fulfilled') {
        setJudgeHistories(historyResult.value)
        setHistoryStatus('idle')
      } else {
        setHistoryStatus('error')
        setHistoryMessage('최근 받은 선비의 한마디를 불러오지 못했습니다.')
      }
    }

    void loadMyPageData()

    return () => {
      ignore = true
    }
  }, [userId])

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

  async function handleDeleteJudgeHistory(historyId: string | undefined) {
    if (!historyId) return
    setHistoryMessage('')

    try {
      await deleteJudgeHistory(historyId)
      setJudgeHistories((current) =>
        current.filter((history) => history.id !== historyId),
      )
      setHistoryMessage('선비의 한마디 기록을 삭제했습니다.')
    } catch {
      setHistoryMessage('선비의 한마디 기록을 삭제하지 못했습니다.')
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

        <section className="mypage-section">
          <div className="mypage-section-heading">
            <h2>최근 받은 선비의 한마디</h2>
            <Link className="common-button common-button--secondary" to="/judge">
              한마디 받으러 가기
            </Link>
          </div>

          {historyStatus === 'loading' && (
            <article className="surface-card mypage-empty-card">
              <p>최근 받은 선비의 한마디를 불러오고 있습니다.</p>
            </article>
          )}

          {historyStatus === 'error' && (
            <p className="form-error" role="status">
              {historyMessage}
            </p>
          )}

          {historyStatus === 'idle' && judgeHistories.length === 0 && (
            <article className="surface-card mypage-empty-card">
              <p>아직 받은 선비의 한마디가 없습니다.</p>
            </article>
          )}

          {judgeHistories.length > 0 && (
            <div className="mypage-history-list">
              {judgeHistories.map((history) => (
                <article className="surface-card mypage-history-card" key={history.id}>
                  <div className="mypage-history-meta">
                    <StatusBadge tone={history.has_image ? 'brown' : 'green'}>
                      {history.has_image ? '사진 기반' : '문장 기반'}
                    </StatusBadge>
                    <span>{formatDate(history.created_at)}</span>
                  </div>
                  <h3>{getSeonbiTypeLabel(history.seonbi_type)} 선비의 한마디</h3>
                  <p>{history.advice}</p>
                  <dl className="mypage-history-detail">
                    <div>
                      <dt>현대어</dt>
                      <dd>{history.modern_translation}</dd>
                    </div>
                    <div>
                      <dt>공유 문구</dt>
                      <dd>{history.share_text}</dd>
                    </div>
                  </dl>
                  {history.id && (
                    <CommonButton
                      type="button"
                      variant="secondary"
                      onClick={() => void handleDeleteJudgeHistory(history.id)}
                    >
                      기록 삭제
                    </CommonButton>
                  )}
                </article>
              ))}
            </div>
          )}

          {historyMessage && historyStatus !== 'error' && (
            <p className="disabled-notice mypage-notice" role="status">
              {historyMessage}
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

function getSeonbiTypeLabel(seonbiType: JudgeHistory['seonbi_type']) {
  if (seonbiType === 'toegye') return '퇴계형'
  if (seonbiType === 'yulgok') return '율곡형'
  if (seonbiType === 'cheosa') return '처사형'
  if (seonbiType === 'uguk') return '우국형'
  return '선비'
}

function formatDate(value: string | undefined) {
  if (!value) return '날짜 정보 없음'

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return '날짜 정보 없음'
  }
}
