import type {
  ScoreTable,
  SeonbiType,
  SeonbiTypeInfo,
  TestResult,
} from '../../features/seonbi-test/types'
import { StatusBadge } from '../common/StatusBadge'

interface ResultCardProps {
  typeInfo: SeonbiTypeInfo
  result: TestResult
}

export function ResultCard({ typeInfo, result }: ResultCardProps) {
  const personalizedStats = getPersonalizedStats(typeInfo, result)
  const statEntries = Object.entries(personalizedStats).map(([label, value]) => ({
    label,
    score: clampScore(value),
  }))

  return (
    <article className="result-card">
      <div className="result-card-header">
        <strong>영주선비길</strong>
        <StatusBadge>선비유형 결과</StatusBadge>
      </div>
      <p className="result-card-kicker">나의 선비유형</p>
      <h2>{typeInfo.name} 선비</h2>
      <p className="result-summary">{typeInfo.title}</p>
      <p className="result-judgement">{typeInfo.oneLineJudgement}</p>
      <p className="result-description">{typeInfo.description}</p>

      <div className="result-title-seal">
        <span>조선식 직함</span>
        <strong>{typeInfo.joseonTitle}</strong>
      </div>

      <div className="result-stat-list" aria-label="선비 능력치">
        {statEntries.map(({ label, score }) => (
          <div className="result-stat" key={label}>
            <div>
              <span className="result-stat-label">{label}</span>
              <strong>{score}</strong>
            </div>
            <span className="result-stat-bar" aria-hidden="true">
              <span
                className="result-stat-fill"
                style={{ width: `${score}%` }}
              />
            </span>
          </div>
        ))}
      </div>

      <div className="result-meta">
        <span>어울리는 여행 스타일</span>
        <strong>{typeInfo.travelStyle}</strong>
      </div>
      <div className="result-meta">
        <span>추천 영주 코스</span>
        <strong>{typeInfo.recommendedRoute.join(' → ')}</strong>
      </div>
      <div className="result-meta">
        <span>추천 키워드</span>
        <strong>{typeInfo.recommendedKeywords.join(', ')}</strong>
      </div>

      <p className="result-friend-invite">{typeInfo.friendInviteText}</p>

      <div className="tag-list" aria-label="선비유형 태그">
        {typeInfo.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="result-card-footer">
        <span>완료 시각</span>
        <time dateTime={result.completedAt}>
          {new Intl.DateTimeFormat('ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(result.completedAt))}
        </time>
      </div>
    </article>
  )
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

function getPersonalizedStats(typeInfo: SeonbiTypeInfo, result: TestResult) {
  const scoreRatios = getScoreRatios(result.scores)

  return {
    학문: applyScoreInfluence(typeInfo.stats.학문, scoreRatios.toegye),
    절개: applyScoreInfluence(typeInfo.stats.절개, scoreRatios.uguk),
    풍류: applyScoreInfluence(typeInfo.stats.풍류, scoreRatios.cheosa),
    개혁: applyScoreInfluence(typeInfo.stats.개혁, scoreRatios.yulgok),
  }
}

function applyScoreInfluence(baseScore: number, scoreRatio: number) {
  const neutralRatio = 0.25
  const maxInfluence = 16
  return clampScore(baseScore + (scoreRatio - neutralRatio) * maxInfluence)
}

function getScoreRatios(scores: ScoreTable | undefined) {
  const normalizedScores: ScoreTable = {
    toegye: getValidScore(scores?.toegye),
    yulgok: getValidScore(scores?.yulgok),
    cheosa: getValidScore(scores?.cheosa),
    uguk: getValidScore(scores?.uguk),
  }
  const totalScore = seonbiTypes.reduce((total, type) => {
    return total + (normalizedScores[type] ?? 0)
  }, 0)

  if (totalScore <= 0) {
    return {
      toegye: 0.25,
      yulgok: 0.25,
      cheosa: 0.25,
      uguk: 0.25,
    } satisfies Record<SeonbiType, number>
  }

  return {
    toegye: normalizedScores.toegye / totalScore,
    yulgok: normalizedScores.yulgok / totalScore,
    cheosa: normalizedScores.cheosa / totalScore,
    uguk: normalizedScores.uguk / totalScore,
  } satisfies Record<SeonbiType, number>
}

function getValidScore(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0
}

const seonbiTypes = ['toegye', 'yulgok', 'cheosa', 'uguk'] as const
