import type { ReactNode } from 'react'
import { BottomNavigation } from './BottomNavigation'
import { TopNavBar } from './TopNavBar'

interface AppLayoutProps {
  children: ReactNode
  hideNavigation?: boolean
  adminMode?: boolean
}

export function AppLayout({
  children,
  hideNavigation = false,
  adminMode = false,
}: AppLayoutProps) {
  return (
    <div className={adminMode ? 'app-shell app-shell--admin' : 'app-shell'}>
      {!hideNavigation && <TopNavBar />}
      <main>{children}</main>
      {!hideNavigation && !adminMode && <BottomNavigation />}
    </div>
  )
}
