import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { CommonButton } from '../components/common/CommonButton'
import { ImagePlaceholder } from '../components/common/ImagePlaceholder'
import { StatusBadge } from '../components/common/StatusBadge'

const featureCards = [
  {
    title: '선비유형 테스트',
    description: '나의 성향을 네 가지 선비 유형 중 하나로 확인합니다.',
  },
  {
    title: '영주 관광 코스 추천',
    description: '공공데이터 연동 후 유형별 코스가 표시됩니다.',
  },
  {
    title: '선비의 한마디',
    description: '문장을 입력하면 한마디를 받는 UI를 준비합니다.',
  },
]

const yeongjuKeywords = ['소수서원', '선비세상', '무섬마을', '부석사', '풍기인삼']

export function HomePage() {
  return (
    <AppLayout>
      <section className="home-hero">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="page-container hero-inner">
          <StatusBadge>영주선비길</StatusBadge>
          <h1>나의 선비유형으로 떠나는 영주 여행길</h1>
          <p>
            전통 선비문화의 정서를 현대적인 관광 플랫폼 경험으로 정리한
            화면입니다.
          </p>
          <Link className="common-button common-button--primary" to="/test">
            선비유형 테스트 시작하기
          </Link>
        </div>
      </section>

      <section className="page-section page-container">
        <div className="card-grid three-columns">
          {featureCards.map((card) => (
            <article className="surface-card feature-card" key={card.title}>
              <span className="card-symbol" aria-hidden="true">
                ✦
              </span>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section page-container split-section">
        <div>
          <StatusBadge tone="brown">대표 키워드</StatusBadge>
          <h2>영주의 선비길을 구성하는 주요 단서</h2>
          <div className="keyword-list" aria-label="영주 대표 키워드">
            {yeongjuKeywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
          <div className="inline-actions">
            <Link className="common-button common-button--secondary" to="/course">
              관광 데이터 영역 보기
            </Link>
            <CommonButton type="button" variant="ghost" disabled>
              관심 코스 저장 준비 중
            </CommonButton>
          </div>
        </div>
        <ImagePlaceholder className="hero-image-placeholder" />
      </section>
    </AppLayout>
  )
}
