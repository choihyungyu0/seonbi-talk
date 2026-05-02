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
  return (
    <article className="result-card">
      <div className="result-card-header">
        <strong>영주선비길</strong>
        <StatusBadge>선비유형 결과</StatusBadge>
      </div>
      <p className="result-card-kicker">나의 선비유형</p>
      <h2>{typeInfo.name} 선비</h2>
      <p className="result-summary">{typeInfo.title}</p>
      <p className="result-description">{typeInfo.description}</p>

      <div className="result-meta">
        <span>어울리는 여행 스타일</span>
        <strong>{typeInfo.travelStyle}</strong>
      </div>
      <div className="result-meta">
        <span>추천 키워드</span>
        <strong>{typeInfo.recommendedKeywords.join(', ')}</strong>
      </div>

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
