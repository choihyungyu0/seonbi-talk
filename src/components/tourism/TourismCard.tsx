import type { TourismContent } from '../../features/tourism/tourismTypes'
import { getTourismPrimaryImageUrl } from '../../features/tourism/tourismImageUrl'
import { ImagePlaceholder } from '../common/ImagePlaceholder'
import { StatusBadge } from '../common/StatusBadge'

interface TourismCardProps {
  item: TourismContent
  selected?: boolean
  isFavorite?: boolean
  onSelect?: (item: TourismContent) => void
  onToggleFavorite?: (item: TourismContent) => void
}

export function TourismCard({
  item,
  selected = false,
  isFavorite = false,
  onSelect,
  onToggleFavorite,
}: TourismCardProps) {
  const imageUrl = getTourismPrimaryImageUrl(item)

  return (
    <article
      className={selected ? 'tourism-card selected' : 'tourism-card'}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(item)}
      onKeyDown={(event) => {
        if (!onSelect) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(item)
        }
      }}
    >
      {imageUrl ? (
        <img className="tourism-image" src={imageUrl} alt="" />
      ) : (
        <ImagePlaceholder label="이미지 정보 없음" />
      )}
      <div className="tourism-card-body">
        <StatusBadge tone="brown">공공데이터</StatusBadge>
        <h3>{item.title ?? '관광지 정보는 실제 공공데이터 연동 후 표시됩니다.'}</h3>
        <dl className="tourism-detail-list">
          <div>
            <dt>유형</dt>
            <dd>{getContentTypeLabel(item.contentTypeId)}</dd>
          </div>
          <div>
            <dt>주소</dt>
            <dd>{item.address ?? '주소 정보 없음'}</dd>
          </div>
          <div>
            <dt>전화번호</dt>
            <dd>{item.tel ?? '전화번호 정보 없음'}</dd>
          </div>
          <div>
            <dt>좌표</dt>
            <dd>{item.mapX !== undefined && item.mapY !== undefined ? '좌표 정보 있음' : '좌표 정보 없음'}</dd>
          </div>
        </dl>
        <p>카드를 선택하면 운영시간, 요금, 주차 정보를 확인할 수 있습니다.</p>
        <button
          type="button"
          className="favorite-toggle-button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite?.(item)
          }}
        >
          {isFavorite ? '관심 코스 해제' : '관심 코스 저장'}
        </button>
      </div>
    </article>
  )
}

function getContentTypeLabel(contentTypeId: string | undefined) {
  if (contentTypeId === '12') return '관광지'
  if (contentTypeId === '14') return '문화시설'
  if (contentTypeId === '32') return '숙박'
  if (contentTypeId === '39') return '음식점'
  return '콘텐츠 유형 정보 없음'
}
