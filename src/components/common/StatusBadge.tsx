import type { ReactNode } from 'react'

interface StatusBadgeProps {
  children: ReactNode
  tone?: 'green' | 'brown' | 'neutral'
}

export function StatusBadge({ children, tone = 'green' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}
