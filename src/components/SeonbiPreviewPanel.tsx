import { Link } from 'react-router-dom'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { seonbiTypes, type SeonbiType } from '../features/seonbi-test/types'
import { useLanguage } from '../features/i18n/LanguageContext'
import { StatusBadge } from './common/StatusBadge'

interface SeonbiPreviewPanelProps {
  selectedType: SeonbiType
  featureLabel: string
  onSelect: (seonbiType: SeonbiType) => void
}

export function SeonbiPreviewPanel({
  selectedType,
  featureLabel,
  onSelect,
}: SeonbiPreviewPanelProps) {
  const { language } = useLanguage()
  const selectedInfo = seonbiTypeInfo[selectedType]
  const englishTypeNames: Record<SeonbiType, string> = {
    toegye: 'Toegye Type',
    yulgok: 'Yulgok Type',
    cheosa: 'Retreating Scholar Type',
    uguk: 'Patriotic Type',
  }
  const localizedFeatureLabel =
    language === 'en' && featureLabel === '추천 코스' ? 'recommended courses' : featureLabel
  const selectedTypeName =
    language === 'en' ? englishTypeNames[selectedType] : selectedInfo.name

  return (
    <section className="surface-card seonbi-preview-panel" aria-labelledby="seonbi-preview-title">
      <div>
        <StatusBadge tone="brown">미리보기</StatusBadge>
        <h2 id="seonbi-preview-title">선비 유형을 선택해 먼저 체험해보세요</h2>
        {language === 'en' ? (
          <p>
            Even without taking the Seonbi type test, you can preview {localizedFeatureLabel}.
            Currently showing recommendations based on {selectedTypeName}.
          </p>
        ) : (
          <p>
            선비유형 테스트를 하지 않아도 {localizedFeatureLabel}을 바로 볼 수 있습니다.
            현재는 {selectedTypeName} 기준으로 보여드리고 있어요.
          </p>
        )}
      </div>
      <div className="course-category-tabs seonbi-type-tabs" aria-label="선비 유형 선택">
        {seonbiTypes.map((seonbiType) => {
          const typeInfo = seonbiTypeInfo[seonbiType]
          const isActive = selectedType === seonbiType

          return (
            <button
              key={seonbiType}
              type="button"
              className={isActive ? 'active' : ''}
              aria-pressed={isActive}
              onClick={() => onSelect(seonbiType)}
            >
              {typeInfo.name}
            </button>
          )
        })}
      </div>
      <div className="seonbi-test-cta">
        <div>
          <strong>나에게 맞는 유형이 궁금하다면</strong>
          <p>선비 테스트를 통해 실제 유형을 확인한 뒤 더 정확한 추천을 받을 수 있습니다.</p>
        </div>
        <Link className="common-button common-button--secondary" to="/test">
          선비 테스트로 내 유형 찾기
        </Link>
      </div>
    </section>
  )
}
