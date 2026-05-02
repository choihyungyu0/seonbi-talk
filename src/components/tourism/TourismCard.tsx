import type { TourismCardModel } from '../../features/tourism/tourismTypes'
import { ImagePlaceholder } from '../common/ImagePlaceholder'
import { StatusBadge } from '../common/StatusBadge'

interface TourismCardProps {
  item: TourismCardModel
}

export function TourismCard({ item }: TourismCardProps) {
  return (
    <article className="tourism-card">
      <ImagePlaceholder />
      <div className="tourism-card-body">
        <StatusBadge tone="brown">{item.label}</StatusBadge>
        <h3>{item.title}</h3>
        <p>공공데이터 조회 후 추천 코스가 표시됩니다.</p>
      </div>
    </article>
  )
}
