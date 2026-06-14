import type { ReactNode } from 'react'
import { FloatingRagChatbot } from '../FloatingRagChatbot'
import { BottomNavigation } from './BottomNavigation'
import { TopNavBar } from './TopNavBar'

interface AppLayoutProps {
  children: ReactNode
  className?: string
  hideNavigation?: boolean
  hideChatbot?: boolean
  hideBottomNavigation?: boolean
  adminMode?: boolean
}

export function AppLayout({
  children,
  className = '',
  hideChatbot = false,
  hideBottomNavigation = false,
  hideNavigation = false,
  adminMode = false,
}: AppLayoutProps) {
  const shellClassName = [
    'app-shell',
    adminMode ? 'app-shell--admin' : '',
    hideBottomNavigation || hideNavigation || adminMode ? 'app-shell--no-bottom-nav' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClassName}>
      {!hideNavigation && <TopNavBar />}
      <main>{children}</main>
      {!hideChatbot && <FloatingRagChatbot />}
      {!hideNavigation && !adminMode && !hideBottomNavigation && <BottomNavigation />}
    </div>
  )
}
