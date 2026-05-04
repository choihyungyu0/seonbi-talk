import { BrandLoading } from './BrandLoading'

interface ImagePlaceholderProps {
  label?: string
  className?: string
  isLoading?: boolean
}

export function ImagePlaceholder({
  label = '공공데이터 이미지 연동 예정',
  className = '',
  isLoading = false,
}: ImagePlaceholderProps) {
  return (
    <div
      className={`image-placeholder ${className}`}
      role={isLoading ? 'status' : 'img'}
      aria-label={label}
      aria-live={isLoading ? 'polite' : undefined}
    >
      {isLoading ? (
        <BrandLoading message={label} compact />
      ) : (
        <span aria-hidden="true">景</span>
      )}
      <p>{label}</p>
    </div>
  )
}
