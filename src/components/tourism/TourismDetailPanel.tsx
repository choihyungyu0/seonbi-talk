import { useEffect } from 'react'
import {
  getTourismPrimaryImageUrl,
  normalizeTourApiImageUrl,
} from '../../features/tourism/tourismImageUrl'
import type { TourismContent, TourismDetail } from '../../features/tourism/tourismTypes'
import { ImagePlaceholder } from '../common/ImagePlaceholder'
import { StatusBadge } from '../common/StatusBadge'

interface TourismDetailPanelProps {
  selectedItem?: TourismContent
  detail?: TourismDetail
  status: 'idle' | 'loading' | 'ready' | 'error'
  message?: string
  isFavorite?: boolean
  onToggleFavorite?: (item: TourismContent) => void
  onClose: () => void
}

export function TourismDetailPanel({
  selectedItem,
  detail,
  status,
  message,
  isFavorite = false,
  onToggleFavorite,
  onClose,
}: TourismDetailPanelProps) {
  useEffect(() => {
    if (status === 'idle' || !selectedItem) return undefined

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, selectedItem, status])

  if (status === 'idle' || !selectedItem) return null

  const item = {
    ...selectedItem,
    ...detail?.item,
  }
  const images = getDetailImages(item, detail?.images ?? [])
  const mainImage = images[0]
  const homepage = getHomepageLink(item.homepage)

  return (
    <div
      className="tourism-detail-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="surface-card tourism-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tourism-detail-title"
        aria-live="polite"
      >
        <div className="tourism-detail-header">
          <div>
            <StatusBadge tone="brown">상세 정보</StatusBadge>
            <h2 id="tourism-detail-title">
              {cleanText(item.title) || '관광지명 정보 없음'}
            </h2>
          </div>
          <button type="button" className="detail-close-button" onClick={onClose}>
            닫기
          </button>
        </div>

        <button
          type="button"
          className={
            isFavorite
              ? 'favorite-toggle-button favorite-toggle-button--saved detail-favorite-button'
              : 'favorite-toggle-button detail-favorite-button'
          }
          aria-pressed={isFavorite}
          aria-label={isFavorite ? '관심 코스 저장 해제' : '관심 코스 저장'}
          onClick={() => onToggleFavorite?.(item)}
        >
          <span aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>
          {isFavorite ? '저장됨' : '관심 코스 저장'}
        </button>

        {status === 'loading' && (
          <ImagePlaceholder label="상세 정보를 불러오고 있습니다." />
        )}

        {status === 'error' && (
          <p className="form-error" role="status">
            {message ?? '상세 정보를 불러오지 못했습니다.'}
          </p>
        )}

        {status === 'ready' && (
          <>
            {mainImage ? (
              <img
                className="tourism-detail-main-image"
                src={mainImage.url}
                alt={cleanText(item.title) || mainImage.name}
              />
            ) : (
              <ImagePlaceholder label="대표 이미지 정보 없음" />
            )}

            {images.length > 1 && (
              <div className="tourism-detail-image-list" aria-label="추가 이미지">
                {images.slice(1).map((image) => (
                  <img key={image.url} src={image.url} alt={image.name} />
                ))}
              </div>
            )}

            <p className="tourism-detail-overview">
              {cleanText(item.overview) || '개요 정보 없음'}
            </p>

            <dl className="tourism-detail-list expanded">
              <DetailRow label="주소" value={item.address} fallback="주소 정보 없음" />
              <DetailRow
                label="운영시간"
                value={item.operatingHours}
                fallback="운영시간 정보 없음"
              />
              <DetailRow label="쉬는날" value={item.restDate} fallback="쉬는날 정보 없음" />
              <DetailRow label="이용요금" value={item.useFee} fallback="요금 정보 없음" />
              <DetailRow label="주차" value={item.parking} fallback="주차 정보 없음" />
              <DetailRow label="전화번호" value={item.tel} fallback="전화번호 정보 없음" />
              <div>
                <dt>홈페이지</dt>
                <dd>
                  {homepage ? (
                    <a href={homepage} target="_blank" rel="noreferrer">
                      홈페이지 보기
                    </a>
                  ) : (
                    '홈페이지 정보 없음'
                  )}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>
    </div>
  )
}

interface DetailRowProps {
  label: string
  value?: string
  fallback: string
}

function DetailRow({ label, value, fallback }: DetailRowProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{cleanText(value) || fallback}</dd>
    </div>
  )
}

function getDetailImages(item: TourismContent, images: TourismContent[]) {
  const imageCandidates = [
    {
      url: getTourismPrimaryImageUrl(item),
      name: cleanText(item.title) || '대표 이미지',
    },
    ...images.map((image) => ({
      url: normalizeTourApiImageUrl(
        image.originImage || image.smallImage || image.firstImage || '',
      ),
      name: cleanText(image.imageName) || cleanText(item.title) || '추가 이미지',
    })),
  ]

  const uniqueUrls = new Set<string>()
  return imageCandidates
    .filter((image) => {
      if (!image.url || uniqueUrls.has(image.url)) return false
      uniqueUrls.add(image.url)
      return true
    })
}

function cleanText(value?: string) {
  if (!value) return ''

  const withoutTags = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

  return withoutTags.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function getHomepageLink(value?: string) {
  const cleaned = cleanText(value)
  const match = cleaned.match(/https?:\/\/[^\s"]+/)
  return match ? match[0] : ''
}
