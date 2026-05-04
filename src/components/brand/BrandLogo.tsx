import { useState } from 'react'

export const seonbiLogoSymbolPath = '/images/brand/seonbi-logo-symbol.png'
export const seonbiLogoFullPath = '/images/brand/seonbi-logo-full.png'

interface BrandLogoProps {
  variant?: 'symbol' | 'full'
  className?: string
  decorative?: boolean
}

export function BrandLogo({
  variant = 'symbol',
  className = '',
  decorative = false,
}: BrandLogoProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const src = variant === 'full' ? seonbiLogoFullPath : seonbiLogoSymbolPath

  if (hasImageError) {
    return (
      <span
        className={`brand-logo-fallback ${className}`}
        aria-hidden={decorative}
        aria-label={decorative ? undefined : '영주선비길 로고'}
      >
        영
      </span>
    )
  }

  return (
    <img
      className={`brand-logo-image brand-logo-image--${variant} ${className}`}
      src={src}
      alt={decorative ? '' : '영주선비길 로고'}
      aria-hidden={decorative}
      onError={() => setHasImageError(true)}
    />
  )
}
