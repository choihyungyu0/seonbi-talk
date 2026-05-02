import { Link } from 'react-router-dom'
import { AuthRequiredModal } from '../components/auth/AuthRequiredModal'
import { CommonButton } from '../components/common/CommonButton'
import { AppLayout } from '../components/layout/AppLayout'
import { ResultCard } from '../components/result/ResultCard'
import { useState } from 'react'
import type { SeonbiTypeResult } from '../features/seonbi-test/types'

const result: SeonbiTypeResult = {
  name: '퇴계형',
  summary: '학문과 원칙을 중시하는 사색형',
  travelStyle: '조용한 탐방과 깊이 있는 해설을 중심으로 한 여행',
}

export function ResultPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <AppLayout>
      <section className="page-section page-container result-page">
        <div className="section-heading center">
          <p className="section-kicker">선비유형 결과</p>
          <h1>당신의 선비 기질은...</h1>
        </div>
        <ResultCard result={result} />
        <div className="page-actions center">
          <Link className="common-button common-button--primary" to="/course">
            영주 추천 코스 보기
          </Link>
          <CommonButton type="button" variant="secondary" onClick={() => setModalOpen(true)}>
            결과 이미지 저장
          </CommonButton>
          <CommonButton type="button" variant="secondary" onClick={() => setModalOpen(true)}>
            친구에게 공유하기
          </CommonButton>
        </div>
      </section>
      <AuthRequiredModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AppLayout>
  )
}
