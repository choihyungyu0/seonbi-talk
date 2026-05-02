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
      <StatusBadge>선비유형 결과</StatusBadge>
      <h2>{typeInfo.name}</h2>
      <p className="result-summary">{typeInfo.title}</p>
      <p>{typeInfo.description}</p>
      <div className="tag-list" aria-label="선비유형 태그">
        {typeInfo.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="result-meta">
        <span>어울리는 여행 스타일</span>
        <strong>{typeInfo.travelStyle}</strong>
      </div>
      <div className="result-meta">
        <span>추천 키워드</span>
        <strong>{typeInfo.recommendedKeywords.join(', ')}</strong>
      </div>
      <div className="score-table" aria-label="선비유형 점수표">
        <span>퇴계형 {result.scores.toegye}</span>
        <span>율곡형 {result.scores.yulgok}</span>
        <span>처사형 {result.scores.cheosa}</span>
        <span>우국형 {result.scores.uguk}</span>
      </div>
    </article>
  )
}
