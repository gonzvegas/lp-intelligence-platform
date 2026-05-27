import { Outlet } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  const { fundsLoadError, dismissFundsLoadError } = useAppContext()

  return (
    <div className="flex min-h-screen w-full bg-[var(--color-surface-muted)]">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar />
        {fundsLoadError ? (
          <div
            role="alert"
            className="flex items-start gap-3 border-b border-amber-200/80 bg-amber-50 px-6 py-3 text-sm text-amber-950 dark:border-amber-900/55 dark:bg-amber-950/35 dark:text-amber-100"
          >
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
              strokeWidth={2}
              aria-hidden
            />
            <p className="min-w-0 flex-1 leading-relaxed">{fundsLoadError}</p>
            <button
              type="button"
              className="-m-1 shrink-0 rounded-lg p-1.5 text-amber-900/70 transition hover:bg-amber-200/70 dark:text-amber-200/85 dark:hover:bg-amber-900/55"
              onClick={dismissFundsLoadError}
              aria-label="Dismiss alert"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        ) : null}
        <main className="flex-1 overflow-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
