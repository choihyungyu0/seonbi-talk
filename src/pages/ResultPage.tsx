import { Link } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { AppLayout } from '../components/layout/AppLayout'
import { ResultCard } from '../components/result/ResultCard'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { loadTestResult } from '../lib/storage'

export function ResultPage() {
  const result = loadTestResult()

  if (!result) {
    return (
      <AppLayout>
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

  return (
    <AppLayout>
      <section className="page-section page-container result-page">
        <div className="section-heading center">
          <p className="section-kicker">선비유형 결과</p>
          <h1>당신의 선비 기질은...</h1>
        </div>
        <ResultCard typeInfo={typeInfo} result={result} />
        <div className="page-actions center">
          <Link className="common-button common-button--primary" to="/course">
            영주 추천 코스 보기
          </Link>
          <CommonButton type="button" variant="secondary" disabled>
            결과 이미지 저장
          </CommonButton>
          <CommonButton type="button" variant="secondary" disabled>
            친구에게 공유하기
          </CommonButton>
        </div>
        <p className="disabled-notice result-notice">
          결과 이미지 저장과 공유 기능은 준비 중입니다.
        </p>
      </section>
    </AppLayout>
  )
}
