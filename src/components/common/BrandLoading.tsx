import { BrandLogo } from '../brand/BrandLogo'

interface BrandLoadingProps {
  message?: string
  compact?: boolean
  className?: string
}

export function BrandLoading({
  message = '선비길을 불러오는 중입니다.',
  compact = false,
  className = '',
}: BrandLoadingProps) {
  return (
    <div
      className={`brand-loading ${compact ? 'brand-loading--compact' : ''} ${className}`}
      role="status"
      aria-live="polite"
    >
      <BrandLogo className="brand-loading-logo" decorative />
      {!compact && <p>{message}</p>}
      <span className="visually-hidden">{message}</span>
    </div>
  )
}
