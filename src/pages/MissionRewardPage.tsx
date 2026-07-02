import { useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import {
  getYeongjuAccommodations,
  getYeongjuRestaurants,
} from '../features/tourism/tourismApi'
import { getTourismDisplayImageUrl } from '../features/tourism/tourismImageUrl'
import type { TourismContent } from '../features/tourism/tourismTypes'
import './MissionRewardPage.css'

const rewardAsset = (fileName: string) => `/images/reward/${fileName}`
const wanjuBadgeSrc = encodeURI('/images/new/image-Photoroom (100).png')

const completedSteps = [
  '소수서원',
  '선비촌',
  '부석사',
  '무섬마을',
  '선비의 한마디',
] as const

const completedMissions = [
  '서원 입구 안내문 확인하기',
  '학문 정신 해설 듣기',
  '부석사 일주문 사진 찍기',
  '무섬마을 전통가옥 관람',
  '선비의 한마디 작성하기',
] as const

type CouponIcon = 'utensils' | 'bed'

const issuedCoupons: {
  place: string
  tone: 'green' | 'gold'
  icon: CouponIcon
}[] = [
  { place: '참여 음식점', tone: 'green', icon: 'utensils' },
  { place: '참여 숙박업소', tone: 'gold', icon: 'bed' },
]

const benefitFlow: { step: number; asset: string; title: string; caption: string }[] = [
  { step: 1, asset: 'scholar.png', title: '관광객', caption: '미션 완료' },
  { step: 2, asset: 'coupon-gold.png', title: '할인 쿠폰', caption: '획득' },
  { step: 3, asset: 'hanok.png', title: '지역 파트너', caption: '방문·이용' },
]

const benefitNotes: { asset: string; title: string; body: string }[] = [
  {
    asset: 'medal-star.png',
    title: '참여 파트너는 혜택 영역 상위 노출',
    body: '지역 파트너의 가시성을 높여 실제 방문과 지역 경제 순환을 유도합니다.',
  },
  {
    asset: 'cycle-heart.png',
    title: '관광객의 참여가 지역에 활력을 더합니다.',
    body: '선비길과 지역이 함께 성장합니다.',
  },
]

const recommendBasis = [
  '관광 추천은 공공데이터와 사용자 적합도를 기준으로 제공합니다.',
  '제휴 혜택은 별도 영역에서 구분하여 안내합니다.',
] as const

const separationPills: { label: string; tone: 'green' | 'gold' }[] = [
  { label: '관광 추천 (공공데이터+적합도)', tone: 'green' },
  { label: '제휴 혜택 (참여 파트너 영역)', tone: 'gold' },
]

type PartnerKind = 'food' | 'stay'

interface Partner {
  name: string
  category: string
  tag: string
  couponRate: string
  kind: PartnerKind
}

const partners: Partner[] = [
  { name: '선비밥상', category: '음식점', tag: '한정식', couponRate: '10%', kind: 'food' },
  { name: '소백한옥스테이', category: '숙박', tag: '한옥스테이', couponRate: '10%', kind: 'stay' },
  { name: '풍기온정국밥', category: '음식점', tag: '한식', couponRate: '10%', kind: 'food' },
]

export function MissionRewardPage() {
  const navigate = useNavigate()
  const summaryRef = useRef<HTMLElement>(null)
  const partnerRef = useRef<HTMLElement>(null)
  const partnerImages = usePartnerImages()

  function scrollToRef(ref: RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <AppLayout className="mission-reward-shell" hideBottomNavigation hideChatbot>
      <section className="mission-reward-page" aria-labelledby="mission-reward-title">
        <div className="mission-reward-inner">
          <RewardHeader />
          <section className="mission-reward-grid" aria-label="미션 완료 보상 대시보드">
            <RewardSummaryCard ref={summaryRef} onViewPartners={() => scrollToRef(partnerRef)} />
            <BenefitFlowCard />
            <PartnerBenefitsCard
              ref={partnerRef}
              images={partnerImages}
              onMorePartners={() => navigate('/heatmap')}
            />
            <RecommendBasisBand />
          </section>
        </div>
        <RewardActionBar
          onCoupons={() => scrollToRef(summaryRef)}
          onPartners={() => scrollToRef(partnerRef)}
          onReport={() => navigate('/mission-complete')}
        />
      </section>
    </AppLayout>
  )
}

function RewardHeader() {
  return (
    <header className="mission-reward-header">
      <img
        className="mission-reward-plaque"
        src={rewardAsset('plaque-reward-notice.png')}
        alt="미션 완료 보상 안내"
      />
      <h1 id="mission-reward-title">오늘의 선비길 미션 완료</h1>
      <p>수고하셨습니다! 미션 완료로 지역 파트너 혜택이 열렸습니다.</p>
      <div className="mission-reward-progress">
        <ol className="mission-reward-progress-steps" aria-label="완료한 코스 단계">
          {completedSteps.map((step, index) => (
            <li key={step}>
              <span className="mission-reward-progress-check" aria-hidden="true">
                <Icon name="check" />
              </span>
              <em>{index + 1}</em>
              {step}
            </li>
          ))}
        </ol>
        <div className="mission-reward-progress-count">
          미션 완료 <strong>5/5</strong>
          <Icon name="sparkle" />
        </div>
      </div>
    </header>
  )
}

function RewardSummaryCard({
  ref,
  onViewPartners,
}: {
  ref?: Ref<HTMLElement>
  onViewPartners: () => void
}) {
  return (
    <article ref={ref} className="mission-reward-card reward-summary-card">
      <CardTitle icon="lotus">미션 완료 보상</CardTitle>

      <div className="reward-hero">
        <div className="reward-medal">
          <img src={wanjuBadgeSrc} alt="선비길 완주 배지" />
          <span className="reward-medal-ribbon">선비길 완주</span>
        </div>
        <div className="reward-hero-copy">
          <span>오늘의 선비길 미션 달성</span>
          <strong>할인 쿠폰 지급</strong>
          <p>참여 음식점 · 숙박업소 10% 할인</p>
        </div>
      </div>

      <section className="reward-mission-list" aria-labelledby="reward-mission-heading">
        <h3 id="reward-mission-heading">완료한 미션</h3>
        <ul>
          {completedMissions.map((mission) => (
            <li key={mission}>
              <span className="reward-mini-check" aria-hidden="true">
                <Icon name="check" />
              </span>
              {mission}
            </li>
          ))}
        </ul>
      </section>

      <section className="reward-coupons" aria-labelledby="reward-coupon-heading">
        <h3 id="reward-coupon-heading">
          발급된 쿠폰 <em>(유효기간 7일)</em>
        </h3>
        <div className="reward-coupon-pair">
          {issuedCoupons.map((coupon) => (
            <div
              key={coupon.place}
              className={`reward-coupon reward-coupon--${coupon.tone}`}
            >
              <span className="reward-coupon-icon" aria-hidden="true">
                <Icon name={coupon.icon} />
              </span>
              <span className="reward-coupon-place">{coupon.place}</span>
              <strong className="reward-coupon-value">
                <b>10%</b> 할인 쿠폰
              </strong>
              <button type="button" onClick={onViewPartners}>
                쿠폰 보기
              </button>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}

function BenefitFlowCard() {
  return (
    <article className="mission-reward-card benefit-flow-card">
      <CardTitle icon="lotus">혜택 연결 구조</CardTitle>
      <p className="benefit-flow-lead">선비길 미션이 지역으로 이어지는 구조입니다.</p>

      <ol className="benefit-flow-steps">
        {benefitFlow.map((flow, index) => (
          <li key={flow.title}>
            <div className="benefit-flow-node">
              <span className="benefit-flow-index" aria-hidden="true">
                {flow.step}
              </span>
              <span className="benefit-flow-art">
                <img src={rewardAsset(flow.asset)} alt="" />
              </span>
              <strong>{flow.title}</strong>
              <em>{flow.caption}</em>
            </div>
            {index < benefitFlow.length - 1 && (
              <span className="benefit-flow-arrow" aria-hidden="true">
                <Icon name="arrow" />
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="benefit-notes">
        {benefitNotes.map((note) => (
          <div key={note.title} className="benefit-note">
            <img className="benefit-note-icon" src={rewardAsset(note.asset)} alt="" />
            <div>
              <strong>{note.title}</strong>
              <p>{note.body}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function PartnerBenefitsCard({
  ref,
  images,
  onMorePartners,
}: {
  ref?: Ref<HTMLElement>
  images: PartnerImageMap
  onMorePartners: () => void
}) {
  return (
    <article ref={ref} className="mission-reward-card partner-card">
      <CardTitle icon="crown">지역 파트너 혜택 (상위 노출 영역)</CardTitle>
      <ul className="partner-list">
        {partners.map((partner, index) => (
          <li key={partner.name} className="partner-item">
            <PartnerThumbnail partner={partner} imageUrl={images[index]} />
            <div className="partner-body">
              <div className="partner-head">
                <strong>{partner.name}</strong>
                <span className="partner-top-tag">상위 노출</span>
              </div>
              <span className="partner-meta">
                {partner.category} <i aria-hidden="true">|</i> {partner.tag}
              </span>
              <div className="partner-coupon">
                <span className="partner-coupon-rate">{partner.couponRate}</span>
                쿠폰 사용 가능
              </div>
            </div>
            <img
              className="partner-ribbon"
              src={rewardAsset('partner-badge.png')}
              alt="참여 파트너"
            />
          </li>
        ))}
      </ul>
      <button type="button" className="partner-more" onClick={onMorePartners}>
        더 많은 참여 파트너 보기
        <Icon name="chevron" />
      </button>
    </article>
  )
}

function PartnerThumbnail({
  partner,
  imageUrl,
}: {
  partner: Partner
  imageUrl?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !failed

  return (
    <div className={`partner-thumb partner-thumb--${partner.kind}`}>
      {showImage ? (
        <img
          src={imageUrl}
          alt={`${partner.name} ${partner.tag}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          className="partner-thumb-fallback"
          src={rewardAsset(partner.kind === 'stay' ? 'hanok.png' : 'coupon-gold.png')}
          alt=""
        />
      )}
    </div>
  )
}

function RecommendBasisBand() {
  return (
    <section className="recommend-basis-band" aria-label="추천과 혜택 운영 기준">
      <div className="recommend-basis">
        <img className="recommend-basis-icon" src={rewardAsset('scroll.png')} alt="" />
        <div>
          <h3>추천 기준 안내</h3>
          <ul>
            {recommendBasis.map((line) => (
              <li key={line}>
                <span className="reward-mini-check" aria-hidden="true">
                  <Icon name="check" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="separation-note">
        <p>추천과 혜택은 분리되어 운영됩니다.</p>
        <div className="separation-pills">
          {separationPills.map((pill) => (
            <span key={pill.label} className={`separation-pill separation-pill--${pill.tone}`}>
              {pill.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function RewardActionBar({
  onCoupons,
  onPartners,
  onReport,
}: {
  onCoupons: () => void
  onPartners: () => void
  onReport: () => void
}) {
  return (
    <footer className="mission-reward-action-bar" aria-label="미션 완료 보상 액션">
      <div className="mission-reward-action-inner">
        <button type="button" className="reward-action" onClick={onCoupons}>
          <Icon name="coupon" />
          쿠폰 확인하기
        </button>
        <button
          type="button"
          className="reward-action reward-action--image"
          onClick={onPartners}
        >
          <img src={rewardAsset('button-view-partners.png')} alt="참여 파트너 보기" />
        </button>
        <button type="button" className="reward-action" onClick={onReport}>
          <Icon name="report" />
          여정 리포트 보기
          <Icon name="chevron" />
        </button>
      </div>
    </footer>
  )
}

function CardTitle({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <h2 className="mission-reward-card-title">
      <Icon name={icon} />
      <span>{children}</span>
      <Icon name={icon} />
    </h2>
  )
}

/* -- Partner image resolution (real Yeongju photos with graceful fallback) -- */

type PartnerImageMap = Record<number, string | undefined>

function usePartnerImages() {
  const [images, setImages] = useState<PartnerImageMap>({})

  useEffect(() => {
    let disposed = false

    async function loadImages() {
      try {
        const [restaurantResponse, accommodationResponse] = await Promise.all([
          getYeongjuRestaurants(),
          getYeongjuAccommodations(),
        ])
        if (disposed) return

        const restaurantImages = collectImageUrls(restaurantResponse.contents, 2)
        const accommodationImages = collectImageUrls(accommodationResponse.contents, 1)

        const next: PartnerImageMap = {}
        partners.forEach((partner, index) => {
          const pool = partner.kind === 'stay' ? accommodationImages : restaurantImages
          next[index] = pool.shift()
        })
        setImages(next)
      } catch {
        // Partner cards render a branded fallback frame when live imagery is unavailable.
      }
    }

    void loadImages()
    return () => {
      disposed = true
    }
  }, [])

  return images
}

function collectImageUrls(items: TourismContent[], limit: number) {
  const urls: string[] = []
  const seen = new Set<string>()

  for (const item of items) {
    if (urls.length >= limit) break
    const url = getTourismDisplayImageUrl(item)
    if (url && !seen.has(url)) {
      seen.add(url)
      urls.push(url)
    }
  }

  return urls
}

/* ---------------- Inline icons for small functional glyphs ---------------- */

type IconName =
  | 'lotus'
  | 'check'
  | 'sparkle'
  | 'utensils'
  | 'bed'
  | 'crown'
  | 'coupon'
  | 'report'
  | 'arrow'
  | 'chevron'

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className={`reward-icon reward-icon--${name}`}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {iconPaths[name]}
    </svg>
  )
}

const iconPaths: Record<IconName, ReactNode> = {
  lotus: (
    <g fill="currentColor">
      <path d="M12 3.4c1.5 1.6 2.3 3.2 2.3 4.9 0 1.6-.8 3-2.3 4.4-1.5-1.4-2.3-2.8-2.3-4.4 0-1.7.8-3.3 2.3-4.9Z" />
      <path d="M6 8.2c1.9.4 3.3 1.2 4.2 2.4.9 1.2 1.2 2.6 1 4.3-1.9-.4-3.3-1.2-4.2-2.4-.9-1.2-1.2-2.6-1-4.3Z" />
      <path d="M18 8.2c.2 1.7-.1 3.1-1 4.3-.9 1.2-2.3 2-4.2 2.4-.2-1.7.1-3.1 1-4.3.9-1.2 2.3-2 4.2-2.4Z" />
    </g>
  ),
  check: (
    <path
      d="M5.5 12.4 10 16.8 18.6 7.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  sparkle: (
    <path
      d="M12 3.2c.5 3.6 1.9 5 5.5 5.5-3.6.5-5 1.9-5.5 5.5-.5-3.6-1.9-5-5.5-5.5 3.6-.5 5-1.9 5.5-5.5Z"
      fill="currentColor"
    />
  ),
  utensils: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v7M5 3v4.2A2 2 0 0 0 7 9.2M9 3v4.2A2 2 0 0 1 7 9.2M7 9.2V21" />
      <path d="M16.5 3c-1.6 0-2.5 2-2.5 4.8 0 2 .8 3 2 3.3V21" />
    </g>
  ),
  bed: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8v10M3 12h18v6M21 18v-4a3 3 0 0 0-3-3h-6v4" />
      <circle cx="7" cy="11" r="1.6" fill="currentColor" stroke="none" />
    </g>
  ),
  crown: (
    <g fill="currentColor">
      <path d="M3 8.5 6.5 12l3-4.5L12 4l2.5 3.5 3 4.5L21 8.5l-1.4 9.1H4.4L3 8.5Z" />
      <rect x="4" y="18.4" width="16" height="2.2" rx="1" />
    </g>
  ),
  coupon: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2a2 2 0 0 0 0 5v2A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5v-2a2 2 0 0 0 0-5v-2Z" />
      <path d="M9 9.5 15 15M9.2 9.5h.01M14.8 15h.01" strokeLinecap="round" />
    </g>
  ),
  report: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h7l5 5v13H6z" />
      <path d="M13 3v5h5" />
      <path d="M9 12.5h6M9 15.5h6M9 9.5h2.5" />
    </g>
  ),
  arrow: (
    <path
      d="M4 12h14m-5-5 5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  chevron: (
    <path
      d="M9 5l7 7-7 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}
