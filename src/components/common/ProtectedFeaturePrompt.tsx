import { Link } from 'react-router-dom'

interface ProtectedFeaturePromptProps {
  description?: string
}

export function ProtectedFeaturePrompt({
  description = '테스트 결과에 따라 추천 코스와 선비의 한마디가 달라집니다.',
}: ProtectedFeaturePromptProps) {
  return (
    <article className="surface-card empty-result-card protected-feature-card">
      <h1>선비유형 테스트를 먼저 완료해주세요.</h1>
      <p>{description}</p>
      <Link className="common-button common-button--primary" to="/test">
        선비유형 테스트 시작하기
      </Link>
    </article>
  )
}
