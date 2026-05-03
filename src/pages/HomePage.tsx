import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { CommonButton } from '../components/common/CommonButton'
import { ImagePlaceholder } from '../components/common/ImagePlaceholder'
import { StatusBadge } from '../components/common/StatusBadge'
import {
  getYeongjuCultureFacilities,
  getYeongjuTouristAttractions,
  searchYeongjuTourismByKeyword,
} from '../features/tourism/tourismApi'
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
const heroSlidesCacheKey = 'yeongju-home-tourism-slides'
const cultureSlidesCacheKey = 'yeongju-home-culture-slides'
const heroSlideLimit = 8
const cultureSlideLimit = 10
const minHeroSlideCount = 3
const minCultureSlideCount = 3

interface HomeHeroImage {
  src: string
  title: string
  contentId?: string
}

export function HomePage() {
  const [heroTourismSlides, setHeroTourismSlides] = useState<HomeHeroImage[]>([])
  const [cultureSlides, setCultureSlides] = useState<HomeHeroImage[]>([])
  const [isHeroImageLoading, setIsHeroImageLoading] = useState(true)
  const [isCultureImageLoading, setIsCultureImageLoading] = useState(true)
  const [activeHeroSlideIndex, setActiveHeroSlideIndex] = useState(0)
  const [isHeroCarouselPaused, setIsHeroCarouselPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [heroRef, handleHeroPointerMove, handleHeroPointerLeave] =
    useHeroMotion<HTMLElement>()
  const [featureRevealRef, isFeatureVisible] = useRevealOnScroll<HTMLDivElement>()
  const [keywordRevealRef, isKeywordVisible] = useRevealOnScroll<HTMLDivElement>()
  const [tourismRevealRef, isTourismVisible] = useRevealOnScroll<HTMLDivElement>()
  const marqueeKeywords = useMemo(() => [...yeongjuKeywords, ...yeongjuKeywords], [])

  useEffect(() => {
    let ignore = false

    async function loadHomeImages() {
      setIsHeroImageLoading(true)
      setIsCultureImageLoading(true)

      const cachedHeroSlides = getCachedHomeImages(heroSlidesCacheKey)
      const cachedCultureSlides = getCachedHomeImages(cultureSlidesCacheKey)
      if (cachedHeroSlides.length > 0) {
        setHeroTourismSlides(cachedHeroSlides)
        setIsHeroImageLoading(false)
      }
      if (cachedCultureSlides.length > 0) {
        setCultureSlides(removeDuplicateHomeImages(cachedCultureSlides, cachedHeroSlides))
        setIsCultureImageLoading(false)
      }

      const images = await findHomeImageSlides(cachedHeroSlides, cachedCultureSlides)
      if (ignore) return

      setHeroTourismSlides(images.heroSlides)
      setCultureSlides(images.cultureSlides)
      setIsHeroImageLoading(false)
      setIsCultureImageLoading(false)

      setCachedHomeImages(heroSlidesCacheKey, images.heroSlides)
      setCachedHomeImages(cultureSlidesCacheKey, images.cultureSlides)
    }

    void loadHomeImages()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    function handleMotionChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches)
    }

    motionQuery.addEventListener('change', handleMotionChange)
    return () => motionQuery.removeEventListener('change', handleMotionChange)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return
    if (isHeroCarouselPaused) return
    if (heroTourismSlides.length < 2) return

    const intervalId = window.setInterval(() => {
      if (document.hidden) return
      setActiveHeroSlideIndex((currentIndex) => {
        return (currentIndex + 1) % heroTourismSlides.length
      })
    }, 4600)

    return () => window.clearInterval(intervalId)
  }, [heroTourismSlides.length, isHeroCarouselPaused, prefersReducedMotion])

  const visibleHeroSlideIndex =
    activeHeroSlideIndex < heroTourismSlides.length ? activeHeroSlideIndex : 0

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
            <div
              className="home-hero-visual-frame"
              onMouseEnter={() => setIsHeroCarouselPaused(true)}
              onMouseLeave={() => setIsHeroCarouselPaused(false)}
              onFocus={() => setIsHeroCarouselPaused(true)}
              onBlur={() => setIsHeroCarouselPaused(false)}
            >
              {heroTourismSlides.length > 0 ? (
                <div className="home-hero-carousel" aria-label="영주 관광지 사진">
                  {heroTourismSlides.map((slide, index) => (
                    <figure
                      className={
                          index === visibleHeroSlideIndex
                          ? 'home-floating-image is-active'
                          : 'home-floating-image'
                      }
                      key={`${slide.contentId ?? slide.src}-${index}`}
                      aria-hidden={index !== visibleHeroSlideIndex}
                    >
                      <img
                        src={slide.src}
                        alt={slide.title}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                      {index === visibleHeroSlideIndex && (
                        <figcaption>{slide.title}</figcaption>
                      )}
                    </figure>
                  ))}
                  <div className="home-carousel-status" aria-hidden="true">
                    <span>{visibleHeroSlideIndex + 1}</span>
                    <span>/</span>
                    <span>{heroTourismSlides.length}</span>
                  </div>
                  <div className="home-carousel-dots" aria-label="관광지 사진 순서">
                    {heroTourismSlides.map((slide, index) => (
                      <button
                        type="button"
                        key={`${slide.contentId ?? slide.src}-dot-${index}`}
                        className={index === visibleHeroSlideIndex ? 'active' : ''}
                        onClick={() => setActiveHeroSlideIndex(index)}
                        aria-label={`${index + 1}번째 관광지 사진 보기: ${slide.title}`}
                        aria-current={index === visibleHeroSlideIndex}
                      />
                    ))}
                  </div>
                </div>
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
          {cultureSlides.length >= minCultureSlideCount ? (
            <div className="home-culture-gallery" aria-label="영주 문화시설 사진">
              <div className="home-culture-track">
                {[...cultureSlides, ...cultureSlides].map((slide, index) => (
                  <figure
                    className="home-culture-card"
                    key={`${slide.contentId ?? slide.src}-culture-${index}`}
                    aria-hidden={index >= cultureSlides.length}
                  >
                    <img
                      src={slide.src}
                      alt={slide.title}
                      loading="lazy"
                      decoding="async"
                    />
                    <figcaption>{slide.title}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            <article className="surface-card home-path-card">
              <StatusBadge tone="neutral">선비길 안내</StatusBadge>
              <h3>문화시설 사진은 준비되는 대로 이어집니다</h3>
              <p>
                {isCultureImageLoading
                  ? '영주 문화시설 이미지를 찾고 있습니다.'
                  : '문화시설 이미지가 부족하면 키워드와 코스 안내를 중심으로 홈 화면을 유지합니다.'}
              </p>
            </article>
          )}
        </div>
      </section>
    </AppLayout>
  )
}

async function findHomeImageSlides(
  cachedHeroSlides: HomeHeroImage[],
  cachedCultureSlides: HomeHeroImage[],
) {
  const heroSlides = cachedHeroSlides.slice(0, heroSlideLimit)
  const cultureSlides = removeDuplicateHomeImages(
    cachedCultureSlides.slice(0, cultureSlideLimit),
    heroSlides,
  )

  if (heroSlides.length >= minHeroSlideCount && cultureSlides.length >= minCultureSlideCount) {
    return {
      heroSlides,
      cultureSlides,
    }
  }

  const loadedHeroSlides =
    heroSlides.length >= minHeroSlideCount
      ? heroSlides
      : await loadTourismSlides('attraction', heroSlideLimit)
  const loadedCultureSlides =
    cultureSlides.length >= minCultureSlideCount
      ? cultureSlides
      : removeDuplicateHomeImages(
          await loadTourismSlides('culture', cultureSlideLimit),
          loadedHeroSlides,
        )

  return {
    heroSlides: loadedHeroSlides,
    cultureSlides: loadedCultureSlides,
  }
}

async function loadTourismSlides(
  type: 'attraction' | 'culture',
  limit: number,
): Promise<HomeHeroImage[]> {
  try {
    const response =
      type === 'attraction'
        ? await getYeongjuTouristAttractions()
        : await getYeongjuCultureFacilities()
    if (response.status === 'ready') {
      const slides = getHomeTourismImages(response.contents, limit)
      if (slides.length > 0) return slides
    }
  } catch {
    // 홈 화면은 관광 이미지 검색 실패 시 조용히 fallback UI를 사용한다.
  }

  const foundImages: HomeHeroImage[] = []
  for (const keyword of homeImageKeywords) {
    if (foundImages.length >= limit) break
    try {
      const response = await searchYeongjuTourismByKeyword(keyword)
      if (response.status !== 'ready') continue

      foundImages.push(
        ...getHomeTourismImages(response.contents, limit - foundImages.length).filter(
          (image) => !foundImages.some((foundImage) => isSameHomeImage(foundImage, image)),
        ),
      )
    } catch {
      // 홈 화면은 관광 이미지 검색 실패 시 조용히 fallback UI를 사용한다.
    }
  }

  return foundImages.slice(0, limit)
}

function getHomeTourismImages(items: TourismContent[], limit: number) {
  return items.reduce<HomeHeroImage[]>((slides, item) => {
    if (slides.length >= limit) return slides

    const image = getHomeTourismImage(item)
    if (!image) return slides
    if (slides.some((slide) => isSameHomeImage(slide, image))) return slides

    slides.push(image)
    return slides
  }, [])
}

function getHomeTourismImage(item: TourismContent) {
  const src = getTourismImageUrl(item)
  if (!src) return null

  return {
    src,
    title: item.title ?? '영주 관광지',
    contentId: item.contentId,
  }
}

function getCachedHomeImages(key: string) {
  if (typeof window === 'undefined') return []

  try {
    const rawImages = window.sessionStorage.getItem(key)
    if (!rawImages) return []

    const images = JSON.parse(rawImages) as Array<Partial<HomeHeroImage>>
    if (!Array.isArray(images)) return []

    return images
      .filter((image) => image.src && image.title)
      .map((image) => ({
        src: image.src as string,
        title: image.title as string,
        contentId: image.contentId,
      }))
  } catch {
    return []
  }
}

function setCachedHomeImages(key: string, images: HomeHeroImage[]) {
  if (typeof window === 'undefined') return

  try {
    if (images.length === 0) {
      window.sessionStorage.removeItem(key)
      return
    }

    window.sessionStorage.setItem(key, JSON.stringify(images))
  } catch {
    // 캐시 저장 실패는 홈 렌더링에 영향을 주지 않는다.
  }
}

function removeDuplicateHomeImages(
  targetImages: HomeHeroImage[],
  sourceImages: HomeHeroImage[],
) {
  return targetImages.filter((targetImage) => {
    return !sourceImages.some((sourceImage) => isSameHomeImage(sourceImage, targetImage))
  })
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
