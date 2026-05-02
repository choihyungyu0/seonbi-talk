import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface CommonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  isLoading?: boolean
  fullWidth?: boolean
}

export function CommonButton({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: CommonButtonProps) {
  return (
    <button
      className={[
        'common-button',
        `common-button--${variant}`,
        fullWidth ? 'common-button--full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? '처리 중...' : children}
    </button>
  )
}
