import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
} from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import './HomeLandingPage.css'

type VisualVariant =
  | 'hero-map'
  | 'seonbi-type'
  | 'heatmap'
  | 'course3d'
  | 'graph'
  | 'diary'
  | 'step'

type SeonbiTypeKey = 'toegye' | 'yulgok' | 'cheosa' | 'uguk'

interface VisualPlaceholderProps {
  variant: VisualVariant
  label?: string
  icon?: string
  compact?: boolean
  imageSrc?: string
  empty?: boolean
}

interface FeatureTeaser {
  title: string
  description: string
  to: string
  variant: VisualVariant
  label: string
  imageSrc?: string
  emptyVisual?: boolean
}

interface FeatureDetail extends FeatureTeaser {
  icon: string
}

interface SeonbiProfile {
  key: SeonbiTypeKey
  title: string
  resultTitle: string
  description: string
  detail: string
  tags: string[]
  score: number
  icon: string
  artwork: string
  tone: 'green' | 'blue' | 'sage' | 'red'
}

const HOME_ASSETS = {
  logo: '/images/brand/logo-mark.webp',
  bgHero: '/images/home/optimized/652ce35e-db13-42b7-846d-e4ab8176aa41.webp',
  bgType: '/images/home/optimized/c41773fd-ba94-42f3-9ce3-3ece892fb14a.webp',
  bgCore: '/images/home/optimized/0b3dfd67-3928-4689-8b6f-918d9b69aef0.webp',
  bgJourney: '/images/home/optimized/cb7a766a-f956-457a-81d8-6b86bef53c85.webp',
  bgMist: '/images/home/optimized/d5441123-5014-4911-87f8-63bfae44d413.webp',
  frameTallLight: '/images/home/optimized/1 (2).webp',
  heroFrame: '/images/home/optimized/image-Photoroom (9).webp',
  heroBadgeFrame: '/images/home/optimized/image-Photoroom (11).webp',
  microStrip: '/images/home/optimized/ChatGPT Image 2026년 6월 14일 오후 02_02_36.webp',
  primaryTestButton: '/images/home/optimized/image-Photoroom (33).webp',
  primaryTestButtonWithTassel: '/images/home/optimized/image-Photoroom (59).webp',
  secondaryCourseButton: '/images/home/optimized/2f21d5b4-ddad-43e7-a288-1cd2824b0202.webp',
  secondaryCourseButtonPlain: '/images/home/optimized/image-Photoroom (60).webp',
  typeBadge: '/images/home/optimized/image-Photoroom (34).webp',
  typeCourseButton: '/images/home/optimized/image-Photoroom (35).webp',
  journeyBadge: '/images/home/optimized/image-Photoroom (46).webp',
  previewPill: '/images/home/optimized/image-Photoroom (7).webp',
  zoomControl: '/images/home/optimized/10cc0692-3d55-44c9-bfe5-3c9270fd2acf.webp',
  heroChoicePanel: '/images/home/optimized/image-Photoroom (21).webp',
  heroChoicePanelAlt: '/images/home/optimized/image-Photoroom (30).webp',
  heroWeatherPanel: '/images/home/optimized/image-Photoroom (23).webp',
  heroAudioPanel: '/images/home/optimized/image-Photoroom (12).webp',
  heroEvidencePanel: '/images/home/optimized/image-Photoroom (13).webp',
  heroMapButtonPanel: '/images/home/optimized/image-Photoroom (14).webp',
  heroNextStopPanel: '/images/home/optimized/image-Photoroom (16).webp',
  heroAiCourseFrame: '/images/home/optimized/image-Photoroom (10).webp',
  heroShowcaseSnapshot: '/images/home/optimized/target-hero-showcase.webp',
  heroTypePreview: '/images/home/optimized/image-Photoroom (3).webp',
  heroCoursePreview: '/images/home/optimized/image-Photoroom (50).webp',
  heroHeatmapPreview: '/images/home/optimized/image-Photoroom (8).webp',
  heroGraphPreview: '/images/home/optimized/image-Photoroom (24).webp',
  targetTeaserType: '/images/home/optimized/target-teaser-type.webp',
  targetTeaserCourse: '/images/home/optimized/target-teaser-course.webp',
  targetTeaserHeatmap: '/images/home/optimized/target-teaser-heatmap.webp',
  targetTeaserGraph: '/images/home/optimized/target-teaser-graph.webp',
  paperFrameWide: '/images/home/optimized/image-Photoroom (32).webp',
  paperFrameDark: '/images/home/optimized/image-Photoroom (28).webp',
  paperFrameLight: '/images/home/optimized/image-Photoroom (29).webp',
  paperFrameTall: '/images/home/optimized/image-Photoroom (58).webp',
  paperFrameTallAlt: '/images/home/optimized/image-Photoroom (57).webp',
  resultFrame: '/images/home/optimized/image-Photoroom (31).webp',
  characterToegye: '/images/home/optimized/1c51baf4-d604-48f7-8a09-ca0ab1c1d982.webp',
  characterYulgok: '/images/home/optimized/3da4cd9c-2865-4ffb-afc9-ab284de979b7.webp',
  characterCheosa: '/images/home/optimized/62ac8f05-5f95-4cd7-b58f-70c2bf586f03.webp',
  characterUguk: '/images/home/optimized/381c59e0-22e6-4c8a-9bc6-20981a00970e.webp',
  iconBook: '/images/home/optimized/image-Photoroom (17).webp',
  iconPerson: '/images/home/optimized/image-Photoroom (18).webp',
  iconMeditation: '/images/home/optimized/image-Photoroom (19).webp',
  iconCar: '/images/home/optimized/image-Photoroom (20).webp',
  iconTarget: '/images/home/optimized/image-Photoroom (22).webp',
  iconBookMedal: '/images/home/optimized/image-Photoroom (24).webp',
  iconMountain: '/images/home/optimized/image-Photoroom (25).webp',
  iconShield: '/images/home/optimized/image-Photoroom (26).webp',
  iconDiary: '/images/home/optimized/image-Photoroom (27).webp',
  iconChart: '/images/home/optimized/image-Photoroom (3).webp',
  iconCompass3d: '/images/home/optimized/image-Photoroom (4).webp',
  iconPavilion: '/images/home/optimized/image-Photoroom (5).webp',
  iconDatabase: '/images/home/optimized/image-Photoroom (6).webp',
  iconTrophy: '/images/home/optimized/image-Photoroom (8).webp',
  iconSettings: '/images/home/optimized/image-Photoroom (15).webp',
  iconSolo: '/images/home/optimized/image-Photoroom (36).webp',
  iconFriend: '/images/home/optimized/image-Photoroom (37).webp',
  iconParent: '/images/home/optimized/image-Photoroom (38).webp',
  iconFamily: '/images/home/optimized/image-Photoroom (39).webp',
  iconNature: '/images/home/optimized/image-Photoroom (40).webp',
  iconFishing: '/images/home/optimized/image-Photoroom (41).webp',
  iconActivity: '/images/home/optimized/image-Photoroom (44).webp',
  iconHealing: '/images/home/optimized/image-Photoroom (43).webp',
  iconPractice: '/images/home/optimized/image-Photoroom (45).webp',
  iconCulture: '/images/home/optimized/image-Photoroom (42).webp',
  iconCompassTiny: '/images/home/optimized/image-Photoroom (47).webp',
  stepScroll: '/images/home/optimized/image-Photoroom (48).webp',
  stepPortrait: '/images/home/optimized/image-Photoroom (49).webp',
  stepCourse: '/images/home/optimized/image-Photoroom (50).webp',
  stepPouch: '/images/home/optimized/image-Photoroom (51).webp',
  stepDiary: '/images/home/optimized/image-Photoroom (52).webp',
  panelUser: '/images/home/optimized/image-Photoroom (53).webp',
  panelPalace: '/images/home/optimized/image-Photoroom (54).webp',
  panelBook: '/images/home/optimized/image-Photoroom (55).webp',
  panelBrush: '/images/home/optimized/image-Photoroom (56).webp',
}

const snapSections = [
  { id: 'home-hero', label: '홈' },
  { id: 'home-type-finder', label: '선비 유형' },
  { id: 'home-core-features', label: '핵심 기능' },
  { id: 'home-journey-flow', label: '여정 시작' },
]

const companionOptions = ['혼자', '친구', '부모님', '아이와']
const keywordOptions = ['조용함', '체험', '역사문화', '힐링', '실천형', '자연']

type HomeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  eager?: boolean
  priority?: boolean
  responsiveWidths?: readonly number[]
}

const HOME_OPTIMIZED_IMAGE_PREFIX = '/images/home/optimized/'
const HOME_RESPONSIVE_IMAGE_PREFIX = '/images/home/responsive/'

const companionOptionIcons: Record<string, string> = {
  혼자: HOME_ASSETS.iconSolo,
  친구: HOME_ASSETS.iconFriend,
  부모님: HOME_ASSETS.iconParent,
  아이와: HOME_ASSETS.iconFamily,
}

const keywordOptionIcons: Record<string, string> = {
  조용함: HOME_ASSETS.iconNature,
  체험: HOME_ASSETS.iconActivity,
  역사문화: HOME_ASSETS.iconCulture,
  힐링: HOME_ASSETS.iconHealing,
  실천형: HOME_ASSETS.iconPractice,
  자연: HOME_ASSETS.iconNature,
}

const seonbiProfiles: Record<SeonbiTypeKey, SeonbiProfile> = {
  toegye: {
    key: 'toegye',
    title: '퇴계형 선비',
    resultTitle: '퇴계형 선비 추천',
    description: '깊은 성찰과 배움으로 마음을 다스리는 선비',
    detail: '조용한 배움과 성찰 키워드가 높게 나타났습니다.',
    tags: ['성찰', '배움', '수양'],
    score: 87,
    icon: HOME_ASSETS.iconBookMedal,
    artwork: HOME_ASSETS.characterToegye,
    tone: 'green',
  },
  yulgok: {
    key: 'yulgok',
    title: '율곡형 선비',
    resultTitle: '율곡형 선비 추천',
    description: '실용적 지혜와 전략으로 세상을 이끄는 선비',
    detail: '체험과 실천을 통해 배움을 완성하려는 성향이 돋보입니다.',
    tags: ['실용', '전략', '탐구'],
    score: 84,
    icon: HOME_ASSETS.iconBookMedal,
    artwork: HOME_ASSETS.characterYulgok,
    tone: 'blue',
  },
  cheosa: {
    key: 'cheosa',
    title: '처사형 선비',
    resultTitle: '처사형 선비 추천',
    description: '자연 속에서 느림의 가치를 실천하는 선비',
    detail: '자연과 힐링을 중심으로 여유로운 길을 선호합니다.',
    tags: ['자연', '여유', '치유'],
    score: 82,
    icon: HOME_ASSETS.iconMountain,
    artwork: HOME_ASSETS.characterCheosa,
    tone: 'sage',
  },
  uguk: {
    key: 'uguk',
    title: '우국형 선비',
    resultTitle: '우국형 선비 추천',
    description: '정의와 책임으로 나라를 위하는 선비',
    detail: '역사문화와 실천형 키워드가 강하게 연결됩니다.',
    tags: ['책임', '역사', '실천'],
    score: 81,
    icon: HOME_ASSETS.iconShield,
    artwork: HOME_ASSETS.characterUguk,
    tone: 'red',
  },
}

const heroFeatureCards: FeatureTeaser[] = [
  {
    title: '선비 유형 탐색',
    description: '나의 성향에 맞는 선비 유형을 찾아보세요.',
    to: '/test',
    variant: 'seonbi-type',
    label: 'Seonbi type artwork placeholder',
    imageSrc: HOME_ASSETS.targetTeaserType,
  },
  {
    title: '3D 코스 프리뷰',
    description: '주요 코스를 3D로 미리 보고 여행 계획을 세워보세요.',
    to: '/tour-3d',
    variant: 'course3d',
    label: '3D course preview image placeholder',
    imageSrc: HOME_ASSETS.targetTeaserCourse,
  },
  {
    title: '관광 히트맵',
    description: '실시간 인기 데이터로 영주의 명소를 한눈에 확인하세요.',
    to: '/heatmap',
    variant: 'heatmap',
    label: 'Heatmap preview placeholder',
    imageSrc: HOME_ASSETS.targetTeaserHeatmap,
  },
  {
    title: 'AI 근거 그래프',
    description: 'AI가 제시하는 추천 근거를 데이터 기반으로 확인해보세요.',
    to: '/knowledge-graph',
    variant: 'graph',
    label: 'Knowledge graph preview placeholder',
    imageSrc: HOME_ASSETS.targetTeaserGraph,
  },
]

const coreFeatures: FeatureDetail[] = [
  {
    title: '관광 히트맵',
    description:
      '공공데이터 기반 관광 집중도 분석으로 영주의 명소와 숨은 명소를 한눈에 확인하세요.',
    to: '/heatmap',
    variant: 'heatmap',
    label: 'Heatmap preview placeholder',
    icon: HOME_ASSETS.iconTarget,
  },
  {
    title: '3D 코스 프리뷰',
    description:
      'AI가 생성한 추천 코스를 3D 지도 위에서 미리 확인하고, 거리와 소요 시간까지 한눈에 파악하세요.',
    to: '/tour-3d',
    variant: 'course3d',
    label: '3D route visual placeholder',
    icon: HOME_ASSETS.iconCulture,
  },
  {
    title: 'AI 근거 그래프',
    description:
      '추천 코스가 선정된 이유를 AI 근거 그래프로 투명하게 확인할 수 있습니다.',
    to: '/knowledge-graph',
    variant: 'graph',
    label: 'Knowledge graph preview placeholder',
    icon: HOME_ASSETS.iconChart,
  },
  {
    title: '선비의 한마디',
    description:
      '여행 중 느낀 생각과 배움을 기록하고, 사진과 함께 나만의 여행 이야기를 저장해 보세요.',
    to: '/judge',
    variant: 'diary',
    label: 'Diary preview placeholder',
    icon: HOME_ASSETS.panelBook,
  },
]

const journeySteps = [
  {
    number: '01',
    title: '선비 테스트',
    description: '나의 성향과 마음을 테스트로 알아보세요.',
    icon: HOME_ASSETS.stepScroll,
  },
  {
    number: '02',
    title: '유형 결과 확인',
    description: '나에게 맞는 선비 유형과 특징을 확인하세요.',
    icon: HOME_ASSETS.stepPortrait,
  },
  {
    number: '03',
    title: '3D 코스 미리보기',
    description: '추천 코스를 3D로 미리 보고 선택해보세요.',
    icon: HOME_ASSETS.stepCourse,
  },
  {
    number: '04',
    title: '여행 미션 진행',
    description: '여행지에서 미션을 수행하며 특별한 경험을 쌓아요.',
    icon: HOME_ASSETS.stepPouch,
  },
  {
    number: '05',
    title: '선비의 한마디 기록',
    description: '여행의 감정과 깨달음을 기록으로 남겨요.',
    icon: HOME_ASSETS.stepDiary,
  },
]

const valueItems = [
  ['AI 추천', '개인 맞춤형 코스 추천', HOME_ASSETS.iconPerson],
  ['3D 시각화', '직관적인 지도로 한눈에', HOME_ASSETS.iconCompass3d],
  ['문화 해설', '역사·문화 스토리 해설 제공', HOME_ASSETS.panelBook],
  ['유형별 여행', '성향에 맞는 여행 스타일 추천', HOME_ASSETS.iconDiary],
  ['기록 저장', '여행 기록과 추억을 보관', HOME_ASSETS.stepDiary],
]

const experienceItems = [
  ['나에게 맞는 선비 유형 추천', HOME_ASSETS.panelUser],
  ['영주 관광지 기반 맞춤 코스', HOME_ASSETS.panelPalace],
  ['AI 해설과 추천 근거 제공', HOME_ASSETS.panelBook],
  ['여행 후 기록 저장', HOME_ASSETS.panelBrush],
]

export function HomeLandingPage() {
  const [activeSectionId, setActiveSectionId] = useState(snapSections[0].id)
  const [selectedCompanion, setSelectedCompanion] = useState('혼자')
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([
    '조용함',
    '역사문화',
    '자연',
  ])

  const recommendedType = useMemo(
    () => getRecommendedType(selectedCompanion, selectedKeywords),
    [selectedCompanion, selectedKeywords],
  )

  useEffect(() => {
    const originalScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    function resetHomeScroll() {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.querySelector<HTMLElement>('.home-snap-container')?.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      })
      setActiveSectionId(snapSections[0].id)
    }

    resetHomeScroll()
    const firstFrameId = window.requestAnimationFrame(resetHomeScroll)
    const secondFrameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resetHomeScroll)
    })

    return () => {
      window.cancelAnimationFrame(firstFrameId)
      window.cancelAnimationFrame(secondFrameId)
      window.history.scrollRestoration = originalScrollRestoration
    }
  }, [])

  useEffect(() => {
    const container = document.querySelector<HTMLElement>('.home-snap-container')
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.home-snap-section'))
    if (sections.length === 0) return

    const initialSection =
      sections.find((section) => section.id === snapSections[0].id) ?? sections[0]
    initialSection.classList.add('is-visible')
    initialSection.classList.add('is-background-ready')

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      sections.forEach((section) => {
        section.classList.add('is-visible')
        section.classList.add('is-background-ready')
      })
      return
    }

    const usesDesktopSnap = window.matchMedia('(min-width: 921px)').matches
    let scrollFrameId = 0

    function updateActiveSectionFromScroll() {
      const rootTop = usesDesktopSnap && container ? container.getBoundingClientRect().top : 0
      const activeSection = sections.reduce((closestSection, section) => {
        const currentDistance = Math.abs(section.getBoundingClientRect().top - rootTop)
        const closestDistance = Math.abs(closestSection.getBoundingClientRect().top - rootTop)
        return currentDistance < closestDistance ? section : closestSection
      }, sections[0])

      activeSection.classList.add('is-visible')
      if (activeSection.id) {
        setActiveSectionId(activeSection.id)
      }
    }

    function handleTrackedScroll() {
      if (scrollFrameId) return
      scrollFrameId = window.requestAnimationFrame(() => {
        scrollFrameId = 0
        updateActiveSectionFromScroll()
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          entry.target.classList.add('is-background-ready')

          const section = entry.target as HTMLElement
          if (section.id) {
            setActiveSectionId(section.id)
          }
        })
      },
      {
        root: usesDesktopSnap ? container : null,
        rootMargin: '0px',
        threshold: 0.42,
      },
    )

    const backgroundObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-background-ready')
          backgroundObserver.unobserve(entry.target)
        })
      },
      {
        root: usesDesktopSnap ? container : null,
        rootMargin: '45% 0px',
        threshold: 0,
      },
    )

    sections.forEach((section) => observer.observe(section))
    sections.forEach((section) => backgroundObserver.observe(section))
    handleTrackedScroll()
    const scrollTarget = usesDesktopSnap && container ? container : window
    const activeSectionIntervalId = window.setInterval(updateActiveSectionFromScroll, 350)
    scrollTarget.addEventListener('scroll', handleTrackedScroll, { passive: true })

    return () => {
      observer.disconnect()
      backgroundObserver.disconnect()
      scrollTarget.removeEventListener('scroll', handleTrackedScroll)
      window.clearInterval(activeSectionIntervalId)
      if (scrollFrameId) {
        window.cancelAnimationFrame(scrollFrameId)
      }
    }
  }, [])

  function handleSectionDotClick(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }

  function toggleKeyword(keyword: string) {
    setSelectedKeywords((currentKeywords) => {
      if (currentKeywords.includes(keyword)) {
        return currentKeywords.filter((currentKeyword) => currentKeyword !== keyword)
      }

      return [...currentKeywords, keyword]
    })
  }

  return (
    <AppLayout
      className="home-app-shell"
      hideBottomNavigation
      hideChatbot
    >
      <div className="home-snap-container">
        <ScrollSnapIndicator
          activeSectionId={activeSectionId}
          onSelectSection={handleSectionDotClick}
        />

        <section id="home-hero" className="home-snap-section home-hero-screen">
          <div className="home-atmosphere" aria-hidden="true" />
          <div className="home-section-inner home-hero-grid">
            <div className="home-hero-copy">
              <Badge imageSrc={HOME_ASSETS.heroBadgeFrame} eager>
                AI 문화 여행 플랫폼
              </Badge>
              <h1>
                AI가 설계하는
                <span>영주의 선비길</span>
              </h1>
              <p>
                3D 인터랙티브 코스와 AI 추천으로 영주의 선비 문화와 관광을
                스마트하게 탐험하세요.
              </p>
              <div className="home-action-row">
                <OrnamentalButton
                  imageSrc={HOME_ASSETS.primaryTestButton}
                  to="/test"
                  variant="primary"
                  eager
                >
                  선비 테스트 시작하기
                </OrnamentalButton>
                <OrnamentalButton
                  imageSrc={HOME_ASSETS.secondaryCourseButton}
                  to="/course"
                  variant="secondary"
                  eager
                >
                  추천 코스 둘러보기
                </OrnamentalButton>
              </div>
              <ul className="home-micro-strip" aria-label="핵심 미리보기">
                <HomeImage src={HOME_ASSETS.microStrip} alt="" aria-hidden="true" eager />
                {[
                  ['유형별 선비 콘텐츠', HOME_ASSETS.iconPerson],
                  ['3D 코스 프리뷰', HOME_ASSETS.iconTarget],
                  ['AI 해설', HOME_ASSETS.iconBook],
                  ['여행 기록 저장', HOME_ASSETS.iconBook],
                ].map(([label, icon]) => (
                  <li key={label}>
                    <HomeImage src={icon} alt="" aria-hidden="true" eager />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <HeroProductShowcase />
          </div>

          <div className="home-section-inner home-feature-teaser-grid" aria-label="주요 기능">
            {heroFeatureCards.map((card, index) => (
              <FeatureTeaserCard
                card={card}
                index={index}
                key={card.title}
              />
            ))}
          </div>
        </section>

        <section id="home-type-finder" className="home-snap-section home-type-screen">
          <div className="home-atmosphere home-atmosphere--right" aria-hidden="true" />
          <div className="home-section-inner home-type-layout">
            <div className="home-section-copy">
              <Badge imageSrc={HOME_ASSETS.typeBadge} textMode="hidden">
                선비 유형 찾기
              </Badge>
              <h2>
                나에게 맞는
                <span>
                  <strong>선비 유형</strong>을 찾아보세요
                </span>
              </h2>
              <p>
                30초 성향 선택으로 나의 여행 성향을 파악하고, 퇴계형·율곡형·처사형·우국형
                중 가장 잘 맞는 선비 유형을 찾아보세요.
              </p>
            </div>

            <div className="home-selection-panel">
              <div className="home-panel-heading">
                <h3>나의 여행 성향 선택</h3>
              </div>
              <div className="home-choice-group">
                <p>함께하는 사람</p>
                <div className="home-chip-row">
                  {companionOptions.map((option) => (
                    <button
                      type="button"
                      className={selectedCompanion === option ? 'home-chip is-selected' : 'home-chip'}
                      aria-pressed={selectedCompanion === option}
                      onClick={() => setSelectedCompanion(option)}
                      key={option}
                    >
                      <HomeImage src={companionOptionIcons[option]} alt="" aria-hidden="true" />
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="home-choice-group">
                <p>여행 선호 키워드 <small>(복수 선택 가능)</small></p>
                <div className="home-chip-row home-chip-row--wrap">
                  {keywordOptions.map((option) => (
                    <button
                      type="button"
                      className={selectedKeywords.includes(option) ? 'home-chip is-selected' : 'home-chip'}
                      aria-pressed={selectedKeywords.includes(option)}
                      onClick={() => toggleKeyword(option)}
                      key={option}
                    >
                      <HomeImage src={keywordOptionIcons[option]} alt="" aria-hidden="true" />
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ResultPanel profile={recommendedType} />
          </div>

          <div className="home-section-inner home-type-card-grid">
            <SeonbiTypeCard profile={seonbiProfiles.toegye} highlighted />
            <SeonbiTypeCard profile={seonbiProfiles.yulgok} />
            <SeonbiTypeCard profile={seonbiProfiles.cheosa} />
            <SeonbiTypeCard profile={seonbiProfiles.uguk} />
          </div>

          <div className="home-section-inner home-centered-actions">
            <div className="home-type-footer-actions">
              <OrnamentalButton
                imageSrc={HOME_ASSETS.primaryTestButton}
                to="/test"
                variant="primary"
              >
                선비 테스트 시작하기
              </OrnamentalButton>
              <OrnamentalButton
                imageSrc={HOME_ASSETS.typeCourseButton}
                to="/course"
                variant="secondary"
              >
                유형별 코스 미리보기
              </OrnamentalButton>
            </div>
            <p className="home-type-footer-note">
              30초면 완료되는 간단한 성향 테스트로 나에게 꼭 맞는 선비 유형을 찾아보세요.
            </p>
          </div>
        </section>

        <section id="home-core-features" className="home-snap-section home-core-screen">
          <div className="home-atmosphere home-atmosphere--wide" aria-hidden="true" />
          <div className="home-section-inner home-section-heading">
            <Badge imageSrc={HOME_ASSETS.heroBadgeFrame}>서비스 핵심 기능</Badge>
            <h2>AI가 영주 여행을 설계하는 방식</h2>
            <p>
              관광 데이터의 시각화, AI의 설명, 3D 경로 미리보기, 여행 기록까지
              영주선비길이 맞춤형 여행을 완성합니다.
            </p>
          </div>

          <div className="home-section-inner home-core-card-grid">
            {coreFeatures.map((feature, index) => (
              <article
                className="home-core-card"
                key={feature.title}
                style={{ '--home-stagger': `${index * 110}ms` } as CSSProperties}
              >
                <div className="home-feature-title-row">
                  <span className="home-feature-icon">
                    <HomeImage src={feature.icon} alt="" aria-hidden="true" />
                  </span>
                  <h3>{feature.title}</h3>
                </div>
                <p>{feature.description}</p>
                <CoreFeaturePreview variant={feature.variant} />
                <Link className="home-card-link" to={feature.to}>
                  자세히 보기
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>

          <div className="home-section-inner home-value-strip" aria-label="서비스 가치">
            {valueItems.map(([title, description, icon], index) => (
              <div
                className="home-value-item"
                key={title}
                style={{ '--home-stagger': `${index * 80}ms` } as CSSProperties}
              >
                <HomeImage src={icon} alt="" aria-hidden="true" />
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="home-journey-flow" className="home-snap-section home-journey-screen">
          <div className="home-atmosphere home-atmosphere--bottom" aria-hidden="true" />
          <div className="home-section-inner home-section-heading home-journey-heading">
            <Badge imageSrc={HOME_ASSETS.journeyBadge} textMode="hidden">
              나만의 선비 여정, 이렇게 시작됩니다
            </Badge>
            <h2>AI와 함께, 나만의 선비길을 시작해보세요</h2>
            <p>
              선비 테스트로 나의 유형을 찾고, 추천 코스를 확인하고, 여행 미션을 수행하며,
              선비의 한마디로 나만의 여정을 기록해보세요.
            </p>
          </div>

          <div className="home-section-inner home-journey-layout">
            <div className="home-timeline" aria-label="서비스 이용 흐름">
              {journeySteps.map((step, index) => (
                <article
                  className="home-step-card"
                  key={step.number}
                  style={{ '--home-stagger': `${index * 120}ms` } as CSSProperties}
                >
                  <span className="home-step-number">{step.number}</span>
                  <VisualPlaceholder variant="step" icon={step.icon} compact />
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>

            <aside className="home-experience-panel">
              <h3>영주선비길과 함께하는 특별한 경험</h3>
              <ul>
                {experienceItems.map(([item, icon]) => (
                  <li key={item}>
                    <HomeImage src={icon} alt="" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <dl className="home-stat-grid">
                <div>
                  <dt>추천 코스</dt>
                  <dd>24+</dd>
                </div>
                <div>
                  <dt>문화 지점</dt>
                  <dd>60+</dd>
                </div>
                <div>
                  <dt>여행 기록</dt>
                  <dd>1,200+</dd>
                </div>
              </dl>
              <OrnamentalButton
                imageSrc={HOME_ASSETS.primaryTestButtonWithTassel}
                to="/test"
                variant="primary"
                full
              >
                지금 선비 테스트 시작하기
              </OrnamentalButton>
              <OrnamentalButton
                imageSrc={HOME_ASSETS.secondaryCourseButtonPlain}
                to="/course"
                variant="light"
                full
              >
                추천 코스 먼저 보기
              </OrnamentalButton>
            </aside>
          </div>

          <div className="home-section-inner home-slogan">
            <HomeImage src={HOME_ASSETS.iconCompassTiny} alt="" aria-hidden="true" />
            <p>
              영주의 선비 정신을 따라, 나를 이해하고 세상을 만나는 여정을 시작하세요.
              <span>데이터 기반 · AI 맞춤 추천 · 문화여행 경험</span>
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

function Badge({
  children,
  eager = false,
  imageSrc,
  textMode = 'overlay',
}: {
  children: string
  eager?: boolean
  imageSrc?: string
  textMode?: 'overlay' | 'hidden'
}) {
  return (
    <span className={imageSrc ? 'home-badge home-badge--asset' : 'home-badge'}>
      {imageSrc ? (
        <HomeImage src={imageSrc} alt="" aria-hidden="true" eager={eager} />
      ) : (
        <span aria-hidden="true" />
      )}
      <span className={imageSrc && textMode === 'hidden' ? 'home-sr-only' : ''}>
        {children}
      </span>
      {!imageSrc && <span aria-hidden="true" />}
    </span>
  )
}

function HomeImage({
  decoding,
  eager = false,
  fetchPriority,
  loading,
  priority = false,
  responsiveWidths,
  sizes,
  src,
  srcSet,
  ...props
}: HomeImageProps) {
  const responsiveSrcSet =
    typeof src === 'string' && responsiveWidths
      ? getHomeResponsiveSrcSet(src, responsiveWidths)
      : undefined

  return (
    <img
      {...props}
      sizes={sizes}
      src={src}
      srcSet={srcSet ?? responsiveSrcSet}
      decoding={decoding ?? 'async'}
      fetchPriority={fetchPriority ?? (priority ? 'high' : undefined)}
      loading={loading ?? (eager || priority ? 'eager' : 'lazy')}
    />
  )
}

function getHomeResponsiveSrcSet(src: string, widths: readonly number[]) {
  if (!src.startsWith(HOME_OPTIMIZED_IMAGE_PREFIX) || !src.endsWith('.webp')) {
    return undefined
  }

  const fileName = src.slice(HOME_OPTIMIZED_IMAGE_PREFIX.length)
  const baseName = fileName.slice(0, -'.webp'.length)

  return widths
    .map((width) => {
      const responsiveSrc = `${HOME_RESPONSIVE_IMAGE_PREFIX}${baseName}-${width}.webp`
      return `${encodeURI(responsiveSrc)} ${width}w`
    })
    .join(', ')
}

function OrnamentalButton({
  children,
  eager = false,
  full = false,
  imageSrc,
  to,
  variant,
}: {
  children: string
  eager?: boolean
  full?: boolean
  imageSrc?: string
  to: string
  variant: 'primary' | 'secondary' | 'light'
}) {
  return (
    <Link
      className={[
        'home-ornament-button',
        `home-ornament-button--${variant}`,
        imageSrc ? 'home-ornament-button--asset' : '',
        full ? 'home-ornament-button--full' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      to={to}
    >
      {imageSrc ? (
        <>
          <HomeImage src={imageSrc} alt="" aria-hidden="true" eager={eager} />
          <span className="home-sr-only">{children}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <span aria-hidden="true">→</span>
        </>
      )}
    </Link>
  )
}

function HeroProductShowcase() {
  return (
    <div className="home-product-showcase" aria-label="AI 추천 코스 미리보기">
      <div className="home-product-photo-slot" aria-label="추후 삽입할 1번째 화면 대표 사진 영역">
        <HomeImage
          className="home-product-showcase-snapshot"
          src={HOME_ASSETS.heroShowcaseSnapshot}
          alt=""
          aria-hidden="true"
          priority
          responsiveWidths={[480, 960]}
          sizes="(min-width: 1200px) 54vw, 92vw"
        />
        <HomeImage src={HOME_ASSETS.heroFrame} alt="" aria-hidden="true" eager />
      </div>
      <div className="home-route-line" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="home-showcase-top-card">
        <HomeImage
          src={HOME_ASSETS.heroChoicePanel}
          alt=""
          aria-hidden="true"
          eager
          responsiveWidths={[480, 960, 1440]}
          sizes="(min-width: 1200px) 24vw, 82vw"
        />
        <strong>나의 여행 성향 선택</strong>
        <div>
          {[
            ['부모님', HOME_ASSETS.iconParent],
            ['조용함', HOME_ASSETS.iconMeditation],
            ['역사문화', HOME_ASSETS.iconCulture],
            ['자차', HOME_ASSETS.iconCar],
          ].map(([chip, icon]) => (
            <span key={chip}>
              <HomeImage src={icon} alt="" aria-hidden="true" eager />
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="home-showcase-weather-card" aria-label="영주시 현재 날씨">
        <HomeImage
          src={HOME_ASSETS.heroWeatherPanel}
          alt=""
          aria-hidden="true"
          eager
          responsiveWidths={[480, 960, 1440]}
          sizes="(min-width: 1200px) 12vw, 48vw"
        />
        <span className="home-sr-only">영주시 24도</span>
      </div>

      <article className="home-ai-course-card">
        <HomeImage
          src={HOME_ASSETS.heroAiCourseFrame}
          alt=""
          aria-hidden="true"
          eager
          responsiveWidths={[480, 960, 1440]}
          sizes="(min-width: 1200px) 24vw, 82vw"
        />
        <h2>AI 추천 코스</h2>
        <strong>소수서원 → 선비촌 → 무섬마을</strong>
        <p>추천 신뢰도</p>
        <div className="home-trust-meter">
          <span>92%</span>
          <i />
        </div>
        <div className="home-evidence-chips">
          {[
            ['TourAPI', HOME_ASSETS.iconDatabase],
            ['주차장', HOME_ASSETS.iconCar],
            ['화장실', HOME_ASSETS.iconPerson],
            ['숙박', HOME_ASSETS.iconBook],
          ].map(([chip, icon]) => (
            <span key={chip}>
              <HomeImage src={icon} alt="" aria-hidden="true" eager />
              {chip}
            </span>
          ))}
        </div>
        <Link to="/course">코스 상세 보기</Link>
      </article>

      <article className="home-next-stop-card">
        <HomeImage
          src={HOME_ASSETS.heroNextStopPanel}
          alt=""
          aria-hidden="true"
          eager
          responsiveWidths={[480, 960]}
          sizes="(min-width: 1200px) 15vw, 64vw"
        />
        <span>다음 목적지</span>
        <strong>선비촌</strong>
        <p>1.8km · 8분</p>
        <Link to="/course">길찾기</Link>
      </article>

      <div className="home-showcase-side">
        <article>
          <HomeImage
            src={HOME_ASSETS.heroAudioPanel}
            alt=""
            aria-hidden="true"
            eager
            responsiveWidths={[480, 960]}
            sizes="(min-width: 1200px) 16vw, 76vw"
          />
          <h2>AI 추천 해설</h2>
          <p>소수서원은 우리나라 최초의 사액으로, 선비 정신의 중심지입니다.</p>
          <div className="home-waveform" aria-hidden="true">
            {Array.from({ length: 21 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
        </article>
        <article>
          <HomeImage
            src={HOME_ASSETS.heroEvidencePanel}
            alt=""
            aria-hidden="true"
            eager
            responsiveWidths={[480, 960]}
            sizes="(min-width: 1200px) 16vw, 76vw"
          />
          <h2>AI 근거</h2>
          <dl>
            <div>
              <dt>역사적 가치</dt>
              <dd>0.92</dd>
            </div>
            <div>
              <dt>방문 선호도</dt>
              <dd>0.88</dd>
            </div>
            <div>
              <dt>접근성</dt>
              <dd>0.85</dd>
            </div>
          </dl>
          <Link to="/knowledge-graph">자세히 보기</Link>
        </article>
      </div>

      <div className="home-showcase-controls" aria-hidden="true">
        <HomeImage
          src={HOME_ASSETS.heroMapButtonPanel}
          alt=""
          eager
          responsiveWidths={[480, 960, 1440]}
          sizes="(min-width: 1200px) 18vw, 70vw"
        />
        <HomeImage src={HOME_ASSETS.iconSettings} alt="" eager />
        <HomeImage src={HOME_ASSETS.zoomControl} alt="" eager />
      </div>
    </div>
  )
}

function FeatureTeaserCard({ card, index }: { card: FeatureTeaser; index: number }) {
  return (
    <Link
      className="home-teaser-card"
      to={card.to}
      style={{ '--home-stagger': `${index * 100}ms` } as CSSProperties}
    >
      <div>
        <h2>{card.title}</h2>
        <p>{card.description}</p>
      </div>
      <VisualPlaceholder
        variant={card.variant}
        label={card.label}
        imageSrc={card.imageSrc}
        empty={card.emptyVisual}
        compact
      />
      <span className="home-round-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  )
}

function CoreFeaturePreview({ variant }: { variant: VisualVariant }) {
  if (variant === 'heatmap') {
    return (
      <div className="home-core-preview home-core-preview--heatmap" aria-hidden="true">
        <div className="home-core-preview-toolbar">
          <strong>관광 집중도 히트맵</strong>
          <span>공공데이터 기반 분석</span>
          <div>
            <b>전체</b>
            <b>명소</b>
            <b>체험</b>
            <b>숙박</b>
          </div>
        </div>
        <div className="home-core-map-shape" />
        <ul className="home-core-heat-legend">
          {['매우 높음', '높음', '보통', '낮음', '매우 낮음'].map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <div className="home-core-zoom-control">
          <span>+</span>
          <span>-</span>
        </div>
        {Array.from({ length: 16 }).map((_, index) => (
          <i key={index} />
        ))}
      </div>
    )
  }

  if (variant === 'course3d') {
    return (
      <div className="home-core-preview home-core-preview--course" aria-hidden="true">
        <HomeImage
          className="home-core-course-art"
          src={HOME_ASSETS.stepCourse}
          alt=""
          responsiveWidths={[480, 960]}
          sizes="(min-width: 1200px) 24vw, 82vw"
        />
        <div className="home-core-route-line">
          <span>소수서원</span>
          <span>부석사</span>
          <span>선비촌</span>
          <span>무섬마을</span>
        </div>
        <aside>
          <strong>코스 정보</strong>
          <dl>
            <div>
              <dt>총 거리</dt>
              <dd>12.6 km</dd>
            </div>
            <div>
              <dt>예상 시간</dt>
              <dd>4시간 30분</dd>
            </div>
            <div>
              <dt>포인트</dt>
              <dd>8곳</dd>
            </div>
          </dl>
          <b>코스 미리보기</b>
        </aside>
        <div className="home-core-preview-tabs">
          <span>추천</span>
          <span>탐방</span>
          <span>체험</span>
        </div>
      </div>
    )
  }

  if (variant === 'graph') {
    return (
      <div className="home-core-preview home-core-preview--graph" aria-hidden="true">
        <div className="home-core-graph-center">
          <HomeImage src={HOME_ASSETS.iconCulture} alt="" />
          <strong>부석사</strong>
        </div>
        {[
          ['역사적 가치', '0.92', HOME_ASSETS.iconBook],
          ['경관 아름다움', '0.89', HOME_ASSETS.iconMountain],
          ['방문 후기', '0.91', HOME_ASSETS.iconDiary],
          ['접근성', '0.74', HOME_ASSETS.iconCar],
          ['체험 가치', '0.87', HOME_ASSETS.iconPerson],
        ].map(([title, score, icon]) => (
          <div className="home-core-graph-node" key={title}>
            <HomeImage src={icon} alt="" />
            <span>{title}</span>
            <b>{score}</b>
          </div>
        ))}
        <ul className="home-core-graph-legend">
          <li>강한 관련</li>
          <li>보통 관련</li>
          <li>약한 관련</li>
        </ul>
      </div>
    )
  }

  return (
    <div className="home-core-preview home-core-preview--diary" aria-hidden="true">
      <aside>
        <strong>나의 기록</strong>
        <span>전체 23</span>
        {['부석사에서의 사색', '부석사에서의 깨달음', '소수서원에서 배운 마음'].map((item) => (
          <b key={item}>{item}</b>
        ))}
        <em>새 기록 작성</em>
      </aside>
      <article>
        <time>2024.05.15</time>
        <h4>부석사에서의 사색</h4>
        <p>산사의 고요한 풍경 속에서 자연과 전통의 어울림이 아름다움에 마음이 편안해졌습니다.</p>
        <HomeImage
          src={HOME_ASSETS.stepCourse}
          alt=""
          responsiveWidths={[480, 960]}
          sizes="(min-width: 1200px) 18vw, 80vw"
        />
        <span>부석사 · 안심일</span>
      </article>
    </div>
  )
}

function ResultPanel({ profile }: { profile: SeonbiProfile }) {
  return (
    <aside className={`home-result-panel home-result-panel--${profile.tone}`} key={profile.key}>
      <HomeImage className="home-result-frame-art" src={HOME_ASSETS.resultFrame} alt="" aria-hidden="true" />
      <span>AI 추천 유형</span>
      <h3>{profile.resultTitle}</h3>
      <p>{profile.detail}</p>
      <div className="home-result-tags">
        {profile.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div
        className="home-score-ring"
        style={{ '--home-score': `${profile.score}%` } as CSSProperties}
      >
        <strong>{profile.score}%</strong>
        <small>적합도</small>
      </div>
      <p>나의 성향과 높은 일치율을 보입니다.</p>
    </aside>
  )
}

function SeonbiTypeCard({
  highlighted = false,
  profile,
}: {
  highlighted?: boolean
  profile: SeonbiProfile
}) {
  return (
    <article
      className={[
        'home-type-card',
        `home-type-card--${profile.tone}`,
        highlighted ? 'home-type-card--highlighted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--home-type-art': `url(${profile.artwork})` } as CSSProperties}
    >
      {highlighted && <span className="home-current-badge">현재 추천</span>}
      <div className="home-type-card-copy">
        {!highlighted && (
          <span className="home-type-icon">
            <HomeImage src={profile.icon} alt="" aria-hidden="true" />
          </span>
        )}
        <h3>{profile.title}</h3>
        <p>{profile.description}</p>
        {highlighted && (
          <div className="home-result-tags">
            {profile.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <span className="home-type-card-art" aria-hidden="true" />
      <Link className="home-type-card-cta" to="/test">
        자세히 보기
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}

function VisualPlaceholder({
  compact = false,
  empty = false,
  icon,
  imageSrc,
  label,
  variant,
}: VisualPlaceholderProps) {
  return (
    <div
      className={[
        'home-visual-placeholder',
        `home-visual-placeholder--${variant}`,
        compact ? 'home-visual-placeholder--compact' : '',
        empty ? 'home-visual-placeholder--empty' : '',
        imageSrc ? 'home-visual-placeholder--image' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="home-corner home-corner--top-left" aria-hidden="true" />
      <span className="home-corner home-corner--top-right" aria-hidden="true" />
      <span className="home-corner home-corner--bottom-left" aria-hidden="true" />
      <span className="home-corner home-corner--bottom-right" aria-hidden="true" />
      {imageSrc ? (
        <HomeImage className="home-visual-image" src={imageSrc} alt="" aria-hidden="true" />
      ) : empty ? null : (
        renderPlaceholderArt(variant, icon)
      )}
      {label && <small className={imageSrc || empty ? 'home-sr-only' : ''}>{label}</small>}
    </div>
  )
}

function renderPlaceholderArt(variant: VisualVariant, icon?: string) {
  if (variant === 'heatmap') {
    return (
      <div className="home-placeholder-heatmap" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
    )
  }

  if (variant === 'graph') {
    return (
      <div className="home-placeholder-graph" aria-hidden="true">
        <span>AI</span>
        <i />
        <i />
        <i />
        <i />
        <b />
        <b />
        <b />
        <b />
      </div>
    )
  }

  if (variant === 'diary') {
    return (
      <div className="home-placeholder-diary" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>
    )
  }

  if (variant === 'hero-map' || variant === 'course3d') {
    return (
      <div className="home-placeholder-route" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    )
  }

  return (
    <div className="home-placeholder-symbol" aria-hidden="true">
      {icon ? <HomeImage src={icon} alt="" /> : <span />}
    </div>
  )
}

function ScrollSnapIndicator({
  activeSectionId,
  onSelectSection,
}: {
  activeSectionId: string
  onSelectSection: (sectionId: string) => void
}) {
  return (
    <nav className="home-scroll-dots" aria-label="홈 섹션 이동">
      {snapSections.map((section) => (
        <button
          type="button"
          className={activeSectionId === section.id ? 'is-active' : ''}
          onClick={() => onSelectSection(section.id)}
          aria-label={`${section.label} 섹션으로 이동`}
          aria-current={activeSectionId === section.id ? 'true' : undefined}
          key={section.id}
        />
      ))}
    </nav>
  )
}

function getRecommendedType(
  companion: string,
  keywords: string[],
): SeonbiProfile {
  const scores: Record<SeonbiTypeKey, number> = {
    toegye: 4,
    yulgok: 2,
    cheosa: 2,
    uguk: 1,
  }

  if (companion === '부모님') scores.toegye += 3
  if (companion === '친구') scores.yulgok += 3
  if (companion === '아이와') scores.uguk += 3
  if (companion === '혼자') scores.cheosa += 1

  keywords.forEach((keyword) => {
    if (keyword === '조용함') scores.toegye += 4
    if (keyword === '역사문화') {
      scores.toegye += 2
      scores.uguk += 3
    }
    if (keyword === '체험') scores.yulgok += 4
    if (keyword === '실천형') {
      scores.yulgok += 3
      scores.uguk += 4
    }
    if (keyword === '힐링') scores.cheosa += 4
    if (keyword === '자연') scores.cheosa += 3
  })

  const bestType = (Object.entries(scores) as Array<[SeonbiTypeKey, number]>).sort(
    (first, second) => second[1] - first[1],
  )[0][0]

  return seonbiProfiles[bestType]
}
