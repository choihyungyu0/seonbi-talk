import { useMemo, useRef, useState, type RefObject } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CourseProgressBadge } from '../components/course/CourseProgressBadge'
import { AppLayout } from '../components/layout/AppLayout'
import './MissionReflectionPage.css'

const missionSteps = [
  { id: 'sosu-seowon', label: '소수서원' },
  { id: 'seonbichon', label: '선비촌' },
  { id: 'buseoksa', label: '부석사' },
  { id: 'museom-village', label: '무섬마을' },
  { id: 'seonbi-record', label: '선비의 한마디' },
] as const

type MissionPlaceId = (typeof missionSteps)[number]['id']

interface MissionReflectionData {
  step: number
  placeName: string
  title: string
  badgeName: string
  completedMissions: string[]
  reward: string[]
  prompt: string
  example: string
  moodKeywords: string[]
  insightKeywords: string[]
  aiText: string
  nextPlace: string
  nextMission: string
  nextMoveTime: string
  nextRoute: string
  badgeAsset: string
  summaryAsset: string
  nextThumbnailAsset: string
}

const missionReflectionData = {
  'sosu-seowon': {
    step: 1,
    placeName: '소수서원',
    title: '소수서원 미션 완료',
    badgeName: '소수서원 배움 배지',
    completedMissions: ['서원 입구 안내문 확인하기', '학문 정신 해설 듣기'],
    reward: ['퇴계형 성찰 포인트 +20', '소수서원 기록 1개 생성'],
    prompt: '오늘 소수서원에서 어떤 생각이 들었나요?',
    example: '배움은 멀리 있는 것이 아니라, 오늘의 마음을 가다듬는 데서 시작된다.',
    moodKeywords: ['성찰', '배움', '차분함', '기록'],
    insightKeywords: ['성찰', '배움', '차분함'],
    aiText: '소수서원에서의 기록은 퇴계형 선비의 핵심인 자기 수양과 배움의 태도에 가깝습니다.',
    nextPlace: '선비촌',
    nextMission: '전통 생활 공간 둘러보기',
    nextMoveTime: '12분',
    nextRoute: '/tour-3d?mode=mission&place=seonbichon',
    badgeAsset: 'b (2).png',
    summaryAsset: '1 (2).png',
    nextThumbnailAsset: 'image-removebg-preview (84).png',
  },
  seonbichon: {
    step: 2,
    placeName: '선비촌',
    title: '선비촌 미션 완료',
    badgeName: '선비촌 생활 배지',
    completedMissions: ['선비촌 입구 도착하기', '전통 생활 공간 둘러보기'],
    reward: ['퇴계형 생활 이해 포인트 +20', '선비촌 기록 1개 생성'],
    prompt: '오늘 선비촌에서 어떤 생각이 들었나요?',
    example: '배움은 책상 위에만 머무는 것이 아니라, 일상의 태도 속에서도 이어진다.',
    moodKeywords: ['생활', '배움', '절제', '기록'],
    insightKeywords: ['생활', '배움', '절제'],
    aiText: '선비촌에서의 기록은 배움이 일상 속 태도와 연결되는 흐름에 가깝습니다.',
    nextPlace: '부석사',
    nextMission: '자연 속 사색 미션',
    nextMoveTime: '25분',
    nextRoute: '/tour-3d?mode=mission&place=buseoksa',
    badgeAsset: '1 (4).png',
    summaryAsset: 'image-Photoroom (67).png',
    nextThumbnailAsset: '1 (5).png',
  },
  buseoksa: {
    step: 3,
    placeName: '부석사',
    title: '부석사 미션 완료',
    badgeName: '부석사 사색 배지',
    completedMissions: ['부석사 입구 도착하기', '자연 속 사색 미션'],
    reward: ['퇴계형 사색 포인트 +20', '부석사 기록 1개 생성'],
    prompt: '오늘 부석사에서 어떤 생각이 들었나요?',
    example: '고요한 풍경 속에서 마음이 천천히 비워졌다.',
    moodKeywords: ['사색', '자연', '차분함', '기록'],
    insightKeywords: ['사색', '자연', '차분함'],
    aiText: '부석사에서의 기록은 자연 속에서 마음을 정리하고 사색하는 흐름에 가깝습니다.',
    nextPlace: '무섬마을',
    nextMission: '고요한 길 걷기',
    nextMoveTime: '30분',
    nextRoute: '/tour-3d?mode=mission&place=museom-village',
    badgeAsset: '1 (5).png',
    summaryAsset: 'image-Photoroom (75).png',
    nextThumbnailAsset: '1 (3).png',
  },
  'museom-village': {
    step: 4,
    placeName: '무섬마을',
    title: '무섬마을 미션 완료',
    badgeName: '무섬마을 고요한 길 배지',
    completedMissions: ['무섬마을 길 도착하기', '고요한 길 걷기'],
    reward: ['퇴계형 고요한 길 포인트 +20', '무섬마을 기록 1개 생성'],
    prompt: '오늘 무섬마을에서 어떤 생각이 들었나요?',
    example: '느리게 걷는 길 위에서 오래 남는 생각을 만났다.',
    moodKeywords: ['고요함', '느림', '성찰', '기록'],
    insightKeywords: ['고요함', '느림', '성찰'],
    aiText: '무섬마을에서의 기록은 느린 걸음 속에서 자신을 돌아보는 흐름에 가깝습니다.',
    nextPlace: '선비의 한마디',
    nextMission: '오늘의 생각 정리하기',
    nextMoveTime: '5분',
    nextRoute: '/mission-complete/seonbi-record',
    badgeAsset: '1 (3).png',
    summaryAsset: 'image-Photoroom (76).png',
    nextThumbnailAsset: '1 (6).png',
  },
  'seonbi-record': {
    step: 5,
    placeName: '선비의 한마디',
    title: '선비의 한마디 여정 완료',
    badgeName: '오늘의 여정 기록 배지',
    completedMissions: ['오늘의 생각 한 문장으로 정리하기', '선비길 기록 저장하기'],
    reward: ['퇴계형 여정 완성 포인트 +20', '선비의 한마디 기록 1개 생성'],
    prompt: '오늘 영주선비길에서 어떤 생각이 남았나요?',
    example: '한 걸음마다 배움이었고, 돌아보니 마음이 조금 더 단정해졌다.',
    moodKeywords: ['완성', '성찰', '기록', '여운'],
    insightKeywords: ['완성', '성찰', '여운'],
    aiText: '오늘의 기록은 배움과 사색을 하나의 여정으로 정리하는 흐름에 가깝습니다.',
    nextPlace: '나의 기록',
    nextMission: '저장된 한마디 확인하기',
    nextMoveTime: '0분',
    nextRoute: '/mission-complete',
    badgeAsset: '1 (6).png',
    summaryAsset: 'image-Photoroom (68).png',
    nextThumbnailAsset: 'image-removebg-preview (84).png',
  },
} as const satisfies Record<MissionPlaceId, MissionReflectionData>

function imageAsset(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

export function MissionReflectionPage() {
  const params = useParams()
  const placeId = params.placeId as MissionPlaceId | undefined
  const navigate = useNavigate()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [reflection, setReflection] = useState('')
  const data = placeId ? missionReflectionData[placeId] : undefined

  const progressText = useMemo(() => {
    if (!data) return ''
    return `${data.step} / ${missionSteps.length} 완료`
  }, [data])

  if (!placeId || !data) {
    return <Navigate to="/mission-complete/sosu-seowon" replace />
  }

  const currentData = data

  function handleSave() {
    try {
      window.localStorage.setItem(
        `yeongju-mission-reflection-${placeId}`,
        JSON.stringify({
          placeId,
          placeName: currentData.placeName,
          reflection,
          savedAt: new Date().toISOString(),
        }),
      )
    } catch {
      // Local persistence is a convenience layer; navigation should remain usable.
    }
    navigate(currentData.nextRoute)
  }

  return (
    <AppLayout className="mission-reflection-shell" hideBottomNavigation hideChatbot>
      <section className="mission-reflection-page" aria-labelledby="mission-reflection-title">
        <MissionReflectionHeader data={currentData} progressText={progressText} />
        <section className="mission-reflection-grid" aria-label="미션 완료 기록 대시보드">
          <CompletionSummaryCard data={currentData} />
          <ReflectionWritingCard
            data={currentData}
            reflection={reflection}
            textareaRef={textareaRef}
            onReflectionChange={setReflection}
          />
          <AiReflectionInsightCard data={currentData} />
        </section>
        <MissionReflectionActionBar
          nextRoute={currentData.nextRoute}
          onEdit={() => textareaRef.current?.focus()}
          onSave={handleSave}
        />
      </section>
    </AppLayout>
  )
}

function MissionReflectionHeader({
  data,
  progressText,
}: {
  data: MissionReflectionData
  progressText: string
}) {
  return (
    <header className="mission-reflection-header">
      <CourseProgressBadge className="mission-reflection-progress-badge" />
      <h1 id="mission-reflection-title">{data.title}</h1>
      <p>오늘의 배움과 생각을 선비의 한마디로 남겨보세요.</p>
      <strong className="mission-reflection-progress-text">{progressText}</strong>
      <MissionProgressStepper activeStep={data.step} />
    </header>
  )
}

function MissionProgressStepper({ activeStep }: { activeStep: number }) {
  return (
    <ol className="mission-reflection-stepper" aria-label="코스 완료 단계">
      {missionSteps.map((step, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber <= activeStep
        const isNext = stepNumber === activeStep + 1
        return (
          <li
            key={step.id}
            className={[isComplete ? 'is-complete' : '', isNext ? 'is-next' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <span className="mission-reflection-step-marker" aria-hidden="true">
              {isComplete ? '✓' : stepNumber}
            </span>
            <span>
              <strong>{step.label}</strong>
              {isComplete && stepNumber === activeStep && <small>(완료)</small>}
              {isNext && <small>(다음 장소)</small>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function CompletionSummaryCard({ data }: { data: MissionReflectionData }) {
  return (
    <article className="mission-reflection-card mission-reflection-summary-card">
      <CardTitle>완료 요약</CardTitle>
      <div className="mission-reflection-badge-block">
        <img src={imageAsset(data.badgeAsset)} alt="" />
        <div>
          <span>{data.placeName}</span>
          <strong>{data.badgeName.replace(`${data.placeName} `, '')}</strong>
        </div>
      </div>

      <section className="mission-reflection-list-box" aria-labelledby="completed-mission-title">
        <h3 id="completed-mission-title">완료 미션</h3>
        <ul>
          {data.completedMissions.map((mission) => (
            <li key={mission}>
              <img src={imageAsset('image-Photoroom (66).png')} alt="" />
              {mission}
            </li>
          ))}
        </ul>
      </section>

      <section className="mission-reflection-reward-box" aria-labelledby="mission-reward-title">
        <h3 id="mission-reward-title">획득 보상</h3>
        <ul>
          {data.reward.map((reward, index) => (
            <li key={reward}>
              <img
                src={imageAsset(index === 0 ? '4 (2).png' : 'image-Photoroom (15).png')}
                alt=""
              />
              <span>{reward.replace(' +20', '')}</span>
              {reward.includes('+20') && <strong>+20</strong>}
            </li>
          ))}
        </ul>
      </section>

      <img className="mission-reflection-summary-art" src={imageAsset(data.summaryAsset)} alt="" />
    </article>
  )
}

function ReflectionWritingCard({
  data,
  reflection,
  textareaRef,
  onReflectionChange,
}: {
  data: MissionReflectionData
  reflection: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onReflectionChange: (value: string) => void
}) {
  return (
    <article className="mission-reflection-writing-card">
      <img
        className="mission-reflection-writing-template"
        src={imageAsset('2 (2).png')}
        alt=""
      />
      <h2>선비의 한마디 작성</h2>
      <div className="mission-reflection-writing-prompt">
        <img src={imageAsset('image-Photoroom (2).png')} alt="" />
        <strong>{data.prompt}</strong>
      </div>
      <label className="visually-hidden" htmlFor="mission-reflection">
        선비의 한마디
      </label>
      <textarea
        id="mission-reflection"
        ref={textareaRef}
        value={reflection}
        maxLength={120}
        placeholder="오늘의 배움과 느낀 점을 한 문장으로 남겨보세요."
        onChange={(event) => onReflectionChange(event.target.value)}
      />
      <span className="mission-reflection-counter">{reflection.length} / 120</span>
      <blockquote>
        <strong>예시:</strong>
        <span>{data.example}</span>
      </blockquote>
      <div className="mission-reflection-keywords" aria-label="마음 키워드">
        <span>마음 키워드</span>
        {data.moodKeywords.map((keyword) => (
          <button key={keyword} type="button" onClick={() => onReflectionChange(keyword)}>
            {keyword}
          </button>
        ))}
      </div>
    </article>
  )
}

function AiReflectionInsightCard({ data }: { data: MissionReflectionData }) {
  return (
    <aside className="mission-reflection-card mission-reflection-ai-card">
      <CardTitle>AI가 읽어낸 마음</CardTitle>
      <div className="mission-reflection-ai-content">
        <img className="mission-reflection-scholar" src={imageAsset('3 (2).png')} alt="" />
        <div className="mission-reflection-ai-copy">
          <div className="mission-reflection-ai-chips" aria-label="AI 해석 키워드">
            {data.insightKeywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
          <p>{data.aiText}</p>
        </div>
      </div>

      <div className="mission-reflection-divider" />

      <section className="mission-reflection-next-card" aria-labelledby="mission-next-title">
        <div>
          <span id="mission-next-title">다음 장소</span>
          <strong>{data.nextPlace}</strong>
          <p>{data.nextMission}</p>
          <em>
            <img src={imageAsset('d.png')} alt="" />
            예상 이동 {data.nextMoveTime}
          </em>
        </div>
        <img src={imageAsset(data.nextThumbnailAsset)} alt="" />
      </section>
    </aside>
  )
}

function MissionReflectionActionBar({
  nextRoute,
  onEdit,
  onSave,
}: {
  nextRoute: string
  onEdit: () => void
  onSave: () => void
}) {
  const navigate = useNavigate()

  return (
    <footer className="mission-reflection-action-bar" aria-label="미션 완료 액션">
      <button type="button" className="mission-reflection-action mission-reflection-action--edit" onClick={onEdit}>
        <img src={imageAsset('e.png')} alt="수정하기" />
        <span>수정하기</span>
      </button>
      <button
        type="button"
        className="mission-reflection-action mission-reflection-action--save"
        onClick={onSave}
      >
        <img src={imageAsset('z.png')} alt="기록 저장하기" />
        <span>기록 저장하기</span>
      </button>
      <button
        type="button"
        className="mission-reflection-action mission-reflection-action--next"
        onClick={() => navigate(nextRoute)}
      >
        <img src={imageAsset('q.png')} alt="다음 장소로 이동하기" />
        <span>다음 장소로 이동하기</span>
      </button>
    </footer>
  )
}

function CardTitle({ children }: { children: string }) {
  return (
    <h2 className="mission-reflection-card-title">
      <span aria-hidden="true">✤</span>
      {children}
      <span aria-hidden="true">✤</span>
    </h2>
  )
}
