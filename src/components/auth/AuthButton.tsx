import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { CommonButton } from '../common/CommonButton'

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  isLoading?: boolean
}

export function AuthButton({
  children,
  isLoading = false,
  ...props
}: AuthButtonProps) {
  return (
    <CommonButton type="submit" fullWidth isLoading={isLoading} {...props}>
      {children}
    </CommonButton>
  )
}
