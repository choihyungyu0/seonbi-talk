interface ImagePlaceholderProps {
  label?: string
  className?: string
}

export function ImagePlaceholder({
  label = '공공데이터 이미지 연동 예정',
  className = '',
}: ImagePlaceholderProps) {
  return (
    <div className={`image-placeholder ${className}`} role="img" aria-label={label}>
      <span aria-hidden="true">景</span>
      <p>{label}</p>
    </div>
  )
}
