import type {
  SeonbiTypeInfo,
  TestResult,
} from '../../features/seonbi-test/types'
import { StatusBadge } from '../common/StatusBadge'

interface ResultCardProps {
  typeInfo: SeonbiTypeInfo
  result: TestResult
}

export function ResultCard({ typeInfo, result }: ResultCardProps) {
  const statEntries = Object.entries(typeInfo.stats).map(([label, value]) => ({
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
