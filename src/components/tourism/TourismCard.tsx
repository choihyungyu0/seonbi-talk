import type { TourismContent } from '../../features/tourism/tourismTypes'
import { ImagePlaceholder } from '../common/ImagePlaceholder'
import { StatusBadge } from '../common/StatusBadge'

interface TourismCardProps {
  item: TourismContent
}

export function TourismCard({ item }: TourismCardProps) {
  return (
    <article className="tourism-card">
      {item.firstImage ? (
        <img className="tourism-image" src={item.firstImage} alt="" />
      ) : (
        <ImagePlaceholder label="이미지 정보 없음" />
      )}
      <div className="tourism-card-body">
        <StatusBadge tone="brown">공공데이터</StatusBadge>
        <h3>{item.title ?? '관광지 정보는 실제 공공데이터 연동 후 표시됩니다.'}</h3>
        <dl className="tourism-detail-list">
          <div>
            <dt>주소</dt>
            <dd>{item.address ?? '주소 정보 없음'}</dd>
          </div>
          <div>
            <dt>전화번호</dt>
            <dd>{item.tel ?? '전화번호 정보 없음'}</dd>
          </div>
        </dl>
        <p>운영시간, 요금, 주차 정보는 별도 상세 API 연동 후 표시 예정입니다.</p>
      </div>
    </article>
  )
}
