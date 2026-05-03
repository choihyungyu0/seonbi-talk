import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { CommonButton } from '../components/common/CommonButton'
import { ImagePlaceholder } from '../components/common/ImagePlaceholder'
import { StatusBadge } from '../components/common/StatusBadge'
import { searchYeongjuTourismByKeyword } from '../features/tourism/tourismApi'
import { getTourismPrimaryImageUrl } from '../features/tourism/tourismImageUrl'
import type { TourismContent } from '../features/tourism/tourismTypes'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'

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
const heroImageKeywords = ['소수서원', '부석사', '무섬마을', '선비세상']

interface HomeHeroImage {
  src: string
  title: string
}

export function HomePage() {
  const [heroImage, setHeroImage] = useState<HomeHeroImage | null>(null)
  const [isHeroImageLoading, setIsHeroImageLoading] = useState(true)
  const [heroParallax, setHeroParallax] = useState({ x: 0, y: 0 })
  const [featureRevealRef, isFeatureVisible] = useRevealOnScroll<HTMLDivElement>()
  const [keywordRevealRef, isKeywordVisible] = useRevealOnScroll<HTMLDivElement>()
  const [tourismRevealRef, isTourismVisible] = useRevealOnScroll<HTMLDivElement>()
  const marqueeKeywords = useMemo(() => [...yeongjuKeywords, ...yeongjuKeywords], [])

  useEffect(() => {
    let ignore = false

    async function loadHeroImage() {
      setIsHeroImageLoading(true)

      const image = await findHeroTourismImage()
      if (ignore) return

      setHeroImage(image)
      setIsHeroImageLoading(false)
    }

    void loadHeroImage()

    return () => {
      ignore = true
    }
  }, [])

  function handleHeroPointerMove(event: PointerEvent<HTMLElement>) {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const rect = event.currentTarget.getBoundingClientRect()
    setHeroParallax({
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
    })
  }

  return (
    <AppLayout>
      <section
        className="home-hero"
        onPointerMove={handleHeroPointerMove}
        onPointerLeave={() => setHeroParallax({ x: 0, y: 0 })}
        style={
          {
            '--hero-parallax-x': `${heroParallax.x * 12}px`,
            '--hero-parallax-y': `${heroParallax.y * 12}px`,
            '--hero-pattern-x': `${heroParallax.x * -4}px`,
            '--hero-pattern-y': `${heroParallax.y * -4}px`,
          } as CSSProperties
        }
      >
        <div className="hero-pattern" aria-hidden="true" />
        <div className="page-container hero-inner">
          <div className="hero-copy">
            <StatusBadge>영주선비길</StatusBadge>
            <h1>나의 선비유형으로 떠나는 영주 여행길</h1>
            <p>
              전통 선비문화의 정서를 현대적인 관광 플랫폼 경험으로 정리한
              화면입니다.
            </p>
            <div className="hero-actions">
              <Link className="common-button common-button--primary" to="/test">
                선비유형 테스트 시작하기
              </Link>
              <Link className="common-button common-button--secondary" to="/course">
                추천 코스 보기
              </Link>
            </div>
          </div>
          <div className="home-hero-visual" aria-label="영주 대표 관광 이미지">
            <div className="home-hero-visual-frame">
              {heroImage ? (
                <figure className="home-floating-image">
                  <img src={heroImage.src} alt={heroImage.title} />
                  <figcaption>{heroImage.title}</figcaption>
                </figure>
              ) : (
                <ImagePlaceholder
                  className="home-hero-image-placeholder"
                  label={
                    isHeroImageLoading
                      ? '공공데이터 이미지를 불러오고 있습니다.'
                      : '공공데이터 이미지 연동 예정'
                  }
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="home-keyword-marquee" aria-label="영주 대표 키워드">
        <div className="home-keyword-track">
          {marqueeKeywords.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              aria-hidden={index >= yeongjuKeywords.length}
            >
              {keyword}
            </span>
          ))}
        </div>
      </section>

      <section className="page-section page-container">
        <div
          ref={featureRevealRef}
          className={`reveal-on-scroll ${isFeatureVisible ? 'is-visible' : ''} card-grid three-columns`}
        >
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
        <div
          ref={keywordRevealRef}
          className={`reveal-on-scroll ${isKeywordVisible ? 'is-visible' : ''}`}
        >
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
              로그인하면 마음에 드는 영주 코스를 저장할 수 있습니다.
            </CommonButton>
          </div>
        </div>
        <div
          ref={tourismRevealRef}
          className={`reveal-on-scroll ${isTourismVisible ? 'is-visible' : ''}`}
        >
          {heroImage ? (
            <figure className="hero-tourism-image">
              <img src={heroImage.src} alt={heroImage.title} />
              <figcaption>{heroImage.title}</figcaption>
            </figure>
          ) : (
            <ImagePlaceholder
              className="hero-image-placeholder"
              label={
                isHeroImageLoading
                  ? '공공데이터 이미지를 불러오고 있습니다.'
                  : '공공데이터 이미지 연동 예정'
              }
            />
          )}
        </div>
      </section>
    </AppLayout>
  )
}

async function findHeroTourismImage(): Promise<HomeHeroImage | null> {
  for (const keyword of heroImageKeywords) {
    const response = await searchYeongjuTourismByKeyword(keyword)
    if (response.status !== 'ready') continue

    const imageItem = response.contents.find((item) => getTourismImageUrl(item))
    if (imageItem) {
      return {
        src: getTourismImageUrl(imageItem),
        title: imageItem.title ?? keyword,
      }
    }
  }

  return null
}

function getTourismImageUrl(item: TourismContent) {
  return getTourismPrimaryImageUrl(item)
}
