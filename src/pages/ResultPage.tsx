import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { AppLayout } from '../components/layout/AppLayout'
import { ResultCard } from '../components/result/ResultCard'
import { ShareResultButton } from '../components/result/ShareResultButton'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { saveResultImage } from '../features/result/saveResultImage'
import { loadTestResult } from '../lib/storage'

export function ResultPage() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const result = loadTestResult()

  if (!result) {
    return (
      <AppLayout hideChatbot hideBottomNavigation>
        <section className="page-section page-container result-page">
          <article className="surface-card empty-result-card">
            <h1>아직 선비유형 테스트 결과가 없습니다.</h1>
            <p>테스트를 먼저 진행해주세요.</p>
            <Link className="common-button common-button--primary" to="/test">
              선비유형 테스트 시작하기
            </Link>
          </article>
        </section>
      </AppLayout>
    )
  }

  const typeInfo = seonbiTypeInfo[result.type]

  async function handleSaveImage() {
    if (!cardRef.current) return

    setIsSavingImage(true)
    setStatusMessage('')

    try {
      await saveResultImage(cardRef.current)
      setStatusMessage('결과 이미지를 저장했습니다.')
    } catch {
      setStatusMessage('이미지 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSavingImage(false)
    }
  }

  return (
    <AppLayout hideChatbot hideBottomNavigation>
      <section className="page-section page-container result-page">
        <div className="section-heading center">
          <p className="section-kicker">선비유형 결과</p>
          <h1>당신의 선비 기질은...</h1>
        </div>
        <div className="result-card-capture" ref={cardRef}>
          <ResultCard typeInfo={typeInfo} result={result} />
        </div>
        <div className="page-actions center">
          <Link className="common-button common-button--primary" to="/course">
            영주 추천 코스 보기
          </Link>
          <CommonButton
            type="button"
            variant="secondary"
            disabled={isSavingImage}
            isLoading={isSavingImage}
            loadingLabel="이미지 저장 중..."
            onClick={handleSaveImage}
          >
            결과 이미지 저장
          </CommonButton>
          <ShareResultButton
            typeInfo={typeInfo}
            disabled={isSavingImage}
            onStatusChange={setStatusMessage}
          />
        </div>
        {statusMessage && (
          <p className="disabled-notice result-notice" role="status">
            {statusMessage}
          </p>
        )}
      </section>
    </AppLayout>
  )
}
