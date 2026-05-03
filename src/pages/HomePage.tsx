import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { CommonButton } from '../components/common/CommonButton'
import { ImagePlaceholder } from '../components/common/ImagePlaceholder'
import { StatusBadge } from '../components/common/StatusBadge'
import { searchYeongjuTourismByKeyword } from '../features/tourism/tourismApi'
import { getTourismPrimaryImageUrl } from '../features/tourism/tourismImageUrl'
import type { TourismContent } from '../features/tourism/tourismTypes'
import { useHeroMotion } from '../hooks/useHeroMotion'
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
const homeImageKeywords = ['소수서원', '부석사', '무섬마을', '선비세상']
const heroImageCacheKey = 'yeongju-home-hero-image'
const secondaryImageCacheKey = 'yeongju-home-secondary-image'

interface HomeHeroImage {
  src: string
  title: string
  contentId?: string
}

export function HomePage() {
  const [heroImage, setHeroImage] = useState<HomeHeroImage | null>(null)
  const [secondaryImage, setSecondaryImage] = useState<HomeHeroImage | null>(null)
  const [isHeroImageLoading, setIsHeroImageLoading] = useState(true)
  const [isSecondaryImageLoading, setIsSecondaryImageLoading] = useState(true)
  const [heroRef, handleHeroPointerMove, handleHeroPointerLeave] =
    useHeroMotion<HTMLElement>()
  const [featureRevealRef, isFeatureVisible] = useRevealOnScroll<HTMLDivElement>()
  const [keywordRevealRef, isKeywordVisible] = useRevealOnScroll<HTMLDivElement>()
  const [tourismRevealRef, isTourismVisible] = useRevealOnScroll<HTMLDivElement>()
  const marqueeKeywords = useMemo(() => [...yeongjuKeywords, ...yeongjuKeywords], [])

  useEffect(() => {
    let ignore = false

    async function loadHeroImage() {
      setIsHeroImageLoading(true)
      setIsSecondaryImageLoading(true)

      const cachedHeroImage = getCachedHomeImage(heroImageCacheKey)
      const cachedSecondaryImage = getCachedHomeImage(secondaryImageCacheKey)
      if (cachedHeroImage) {
        setHeroImage(cachedHeroImage)
        setIsHeroImageLoading(false)
      }
      if (
        cachedHeroImage &&
        cachedSecondaryImage &&
        !isSameHomeImage(cachedHeroImage, cachedSecondaryImage)
      ) {
        setSecondaryImage(cachedSecondaryImage)
        setIsSecondaryImageLoading(false)
      }

      const images = await findHomeTourismImages(cachedHeroImage)
      if (ignore) return

      setHeroImage(images.heroImage)
      setSecondaryImage(images.secondaryImage)
      setIsHeroImageLoading(false)
      setIsSecondaryImageLoading(false)

      setCachedHomeImage(heroImageCacheKey, images.heroImage)
      setCachedHomeImage(secondaryImageCacheKey, images.secondaryImage)
    }

    void loadHeroImage()

    return () => {
      ignore = true
    }
  }, [])

  return (
    <AppLayout>
      <section
        ref={heroRef}
        className="home-hero"
        onPointerMove={handleHeroPointerMove}
        onPointerLeave={handleHeroPointerLeave}
      >
        <div className="hero-pattern" aria-hidden="true" />
        <svg
          className="home-seonbi-line"
          viewBox="0 0 920 520"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M18 420 C 170 280, 245 470, 386 318 S 610 115, 902 172" />
          <path d="M92 124 C 235 30, 342 192, 498 122 S 730 48, 868 92" />
        </svg>
        <div className="page-container hero-inner">
          <div className="hero-copy">
            <StatusBadge>영주선비길</StatusBadge>
            <h1 className="home-hero-title" aria-label="나의 선비유형으로 떠나는 영주 여행길">
              <span className="hero-title-line">나의 선비유형으로</span>
              <span className="hero-title-line">떠나는 영주 여행길</span>
            </h1>
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
                  <img
                    src={heroImage.src}
                    alt={heroImage.title}
                    loading="eager"
                    decoding="async"
                  />
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
          {featureCards.map((card, index) => (
            <article
              className="surface-card feature-card"
              key={card.title}
              style={{ '--reveal-delay': `${index * 140}ms` } as CSSProperties}
            >
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
          className={`reveal-on-scroll reveal-from-left ${isKeywordVisible ? 'is-visible' : ''}`}
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
          className={`reveal-on-scroll reveal-from-right ${isTourismVisible ? 'is-visible' : ''}`}
        >
          {secondaryImage ? (
            <figure className="hero-tourism-image">
              <img
                src={secondaryImage.src}
                alt={secondaryImage.title}
                loading="lazy"
                decoding="async"
              />
              <figcaption>{secondaryImage.title}</figcaption>
            </figure>
          ) : (
            <article className="surface-card home-path-card">
              <StatusBadge tone="neutral">선비길 안내</StatusBadge>
              <h3>반복되는 사진 대신 길의 맥락을 보여줍니다</h3>
              <p>
                {isSecondaryImageLoading
                  ? '다른 영주 관광 이미지를 찾고 있습니다.'
                  : '다른 대표 이미지를 찾지 못하면 키워드와 코스 안내를 중심으로 홈 화면을 유지합니다.'}
              </p>
            </article>
          )}
        </div>
      </section>
    </AppLayout>
  )
}

async function findHomeTourismImages(cachedHeroImage: HomeHeroImage | null) {
  const foundImages: HomeHeroImage[] = []

  if (cachedHeroImage) foundImages.push(cachedHeroImage)

  for (const keyword of homeImageKeywords) {
    if (foundImages.length >= 2) break

    try {
      const response = await searchYeongjuTourismByKeyword(keyword)
      if (response.status !== 'ready') continue

      for (const item of response.contents) {
        const image = getHomeTourismImage(item, keyword)
        if (!image) continue
        if (foundImages.some((foundImage) => isSameHomeImage(foundImage, image))) {
          continue
        }

        foundImages.push(image)
        if (foundImages.length >= 2) break
      }
    } catch {
      // 홈 화면은 관광 이미지 검색 실패 시 조용히 fallback UI를 사용한다.
    }
  }

  return {
    heroImage: foundImages[0] ?? null,
    secondaryImage:
      foundImages[0] && foundImages[1] && !isSameHomeImage(foundImages[0], foundImages[1])
        ? foundImages[1]
        : null,
  }
}

function getHomeTourismImage(item: TourismContent, fallbackTitle: string) {
  const src = getTourismImageUrl(item)
  if (!src) return null

  return {
    src,
    title: item.title ?? fallbackTitle,
    contentId: item.contentId,
  }
}

function getCachedHomeImage(key: string) {
  if (typeof window === 'undefined') return null

  try {
    const rawImage = window.sessionStorage.getItem(key)
    if (!rawImage) return null

    const image = JSON.parse(rawImage) as Partial<HomeHeroImage>
    if (!image.src || !image.title) return null

    return {
      src: image.src,
      title: image.title,
      contentId: image.contentId,
    }
  } catch {
    return null
  }
}

function setCachedHomeImage(key: string, image: HomeHeroImage | null) {
  if (typeof window === 'undefined') return

  try {
    if (!image) {
      window.sessionStorage.removeItem(key)
      return
    }

    window.sessionStorage.setItem(key, JSON.stringify(image))
  } catch {
    // 캐시 저장 실패는 홈 렌더링에 영향을 주지 않는다.
  }
}

function isSameHomeImage(firstImage: HomeHeroImage, secondImage: HomeHeroImage) {
  if (firstImage.contentId && secondImage.contentId) {
    return firstImage.contentId === secondImage.contentId
  }

  return firstImage.src === secondImage.src || firstImage.title === secondImage.title
}

function getTourismImageUrl(item: TourismContent) {
  return getTourismPrimaryImageUrl(item)
}
