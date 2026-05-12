import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="flex min-h-screen w-full bg-[var(--color-surface-muted)]">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
