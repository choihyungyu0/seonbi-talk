import type { SeonbiTypeResult } from '../../features/seonbi-test/types'
import { StatusBadge } from '../common/StatusBadge'

interface ResultCardProps {
  result: SeonbiTypeResult
}

export function ResultCard({ result }: ResultCardProps) {
  return (
    <article className="result-card">
      <StatusBadge>선비유형 결과</StatusBadge>
      <h2>{result.name}</h2>
      <p className="result-summary">{result.summary}</p>
      <div className="result-meta">
        <span>어울리는 여행 스타일</span>
        <strong>{result.travelStyle}</strong>
      </div>
    </article>
  )
}
