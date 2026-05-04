import { useState } from 'react'

export const seonbiLogoSymbolPath = '/images/brand/logo-symbol.webp'
export const seonbiLogoFullPath = '/images/brand/logo-full.webp'
export const seonbiLogoMarkPath = '/images/brand/logo-mark.webp'

interface BrandLogoProps {
  variant?: 'symbol' | 'full' | 'mark'
  className?: string
  decorative?: boolean
}

export function BrandLogo({
  variant = 'symbol',
  className = '',
  decorative = false,
}: BrandLogoProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const src =
    variant === 'full'
      ? seonbiLogoFullPath
      : variant === 'mark'
        ? seonbiLogoMarkPath
        : seonbiLogoSymbolPath

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
