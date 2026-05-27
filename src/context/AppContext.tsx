import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Fund, PersonaId } from '../domain/types'
import { PERSONA_LABEL } from '../domain/personas'
import { USE_MOCKS, api, setApiActorHeadersProvider } from '../api/client'

const STORAGE_KEY = 'lip.shell.demoPrefs'
const THEME_STORAGE_KEY = 'lip.theme'

export type ColorScheme = 'light' | 'dark'

function loadTheme(): ColorScheme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY)
    if (t === 'dark' || t === 'light') return t
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function applyThemeClass(scheme: ColorScheme) {
  document.documentElement.classList.toggle('dark', scheme === 'dark')
}

function formatFundsLoadError(e: unknown): string {
  let r = ''
  if (e instanceof Error) {
    r = `${e.message}`.trim() || `${e.name}`.trim()
  } else if (typeof e === 'string') {
    r = e.trim()
  }
  if (!r) r = 'Unknown error loading funds.'
  if (USE_MOCKS) {
    return `Could not load built-in fixtures: ${r}`
  }
  if (/401|not authenticated/i.test(r)) {
    return 'API returned 401. For local dev set SKIP_JWT_AUTH=true on FastAPI (backend/.env), or sign in with Microsoft so requests include a Bearer token.'
  }
  if (/JWT validation enabled|TENANT_ID|JWT_AUDIENCE|503/i.test(r)) {
    return 'Backend JWT validation is partially configured. Set SKIP_JWT_AUTH=true for local dev or fill JWT_TENANT_ID / JWT_AUDIENCE on the backend.'
  }
  if (/timed out|timeout/i.test(r)) {
    return 'The API didn’t respond in time. Ensure FastAPI is running on port 8000—or set VITE_USE_MOCKS=true in `.env.development` for fixture data—and restart `npm run dev`.'
  }
  if (/Failed to fetch|NetworkError|Load failed|ECONNREFUSED|ENOTFOUND|ECONNRESET|504|502/i.test(r)) {
    return 'Cannot reach FastAPI (/api proxies to port 8000). Start the backend, or use fixtures: set VITE_USE_MOCKS=true in `.env.development` and restart `npm run dev`.'
  }
  return r.length > 260 ? `${r.slice(0, 260)}…` : r
}

/** Avoid hung `/api` (dead backend/proxy); prevents eternal “Loading…”. */
function withTimeoutMs<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let tid: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, rej) => {
    tid = setTimeout(() => rej(new Error(`${label}: timed out after ${Math.round(ms / 1000)}s`)), ms)
  })
  return Promise.race([
    p.finally(() => clearTimeout(tid)),
    timeoutPromise,
  ])
}

function listFundsDeadlineMs(): number {
  return USE_MOCKS ? 10_000 : 28_000
}

const PERSONAS: PersonaId[] = ['gp', 'compliance', 'ir', 'legal', 'admin']

function loadInitialPrefs(): { fundId: string; persona: PersonaId } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { fundId: '', persona: 'gp' }
    const j = JSON.parse(raw) as { fundId?: string; persona?: string }
    const persona =
      j.persona && PERSONAS.includes(j.persona as PersonaId)
        ? (j.persona as PersonaId)
        : 'gp'
    const fundId = typeof j.fundId === 'string' ? j.fundId : ''
    return { fundId, persona }
  } catch {
    return { fundId: '', persona: 'gp' }
  }
}

interface AppContextValue {
  fundId: string
  setFundId: (id: string) => void
  fundName: string
  funds: Fund[]
  fundsLoading: boolean
  /** User-facing explanation when `/funds` failed (empty picker + dashboards). */
  fundsLoadError: string | null
  dismissFundsLoadError: () => void
  refreshFunds: () => Promise<void>
  persona: PersonaId
  setPersona: (p: PersonaId) => void
  colorScheme: ColorScheme
  setColorScheme: (s: ColorScheme) => void
  toggleColorScheme: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [{ fundId, persona }, setPrefs] = useState(loadInitialPrefs)
  const [funds, setFunds] = useState<Fund[]>([])
  const [fundsLoading, setFundsLoading] = useState(true)
  const [fundsLoadError, setFundsLoadError] = useState<string | null>(null)
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(loadTheme)
  const fundsBootstrapGenRef = useRef(0)

  useLayoutEffect(() => {
    applyThemeClass(colorScheme)
  }, [colorScheme])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, colorScheme)
    } catch {
      /* ignore */
    }
  }, [colorScheme])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ fundId, persona }))
  }, [fundId, persona])

  const reconcileFundId = useCallback((rows: Fund[], currentFundId: string) => {
    if (rows.length === 0) return ''
    if (currentFundId && rows.some((r) => r.id === currentFundId)) return currentFundId
    return rows[0].id
  }, [])

  useEffect(() => {
    fundsBootstrapGenRef.current += 1
    const gen = fundsBootstrapGenRef.current
    setFundsLoading(true)
    setFundsLoadError(null)

    ;(async () => {
      try {
        const rows = await withTimeoutMs(
          api.listFunds(),
          listFundsDeadlineMs(),
          'Funds request',
        )
        if (gen !== fundsBootstrapGenRef.current) return
        setFunds(rows)
        setFundsLoadError(null)
        setPrefs((p) => {
          const nextId = reconcileFundId(rows, p.fundId)
          if (nextId === p.fundId) return p
          return { ...p, fundId: nextId }
        })
      } catch (e) {
        if (import.meta.env.DEV) console.error('[lip] api.listFunds failed', e)
        if (gen !== fundsBootstrapGenRef.current) return
        setFunds([])
        setFundsLoadError(formatFundsLoadError(e))
      } finally {
        if (gen === fundsBootstrapGenRef.current) setFundsLoading(false)
      }
    })()

    return () => {
      fundsBootstrapGenRef.current += 1
    }
  }, [reconcileFundId])

  const dismissFundsLoadError = useCallback(() => {
    setFundsLoadError(null)
  }, [])

  const refreshFunds = useCallback(async () => {
    setFundsLoadError(null)
    try {
      const rows = await api.listFunds()
      setFunds(rows)
      setPrefs((p) => {
        const nextId = reconcileFundId(rows, p.fundId)
        if (nextId === p.fundId) return p
        return { ...p, fundId: nextId }
      })
      setFundsLoadError(null)
    } catch (e) {
      if (import.meta.env.DEV) console.error('[lip] refreshFunds failed', e)
      setFunds([])
      setFundsLoadError(formatFundsLoadError(e))
    }
  }, [reconcileFundId])

  const fundName = useMemo(() => {
    if (!fundId) return 'No fund selected'
    return funds.find((f) => f.id === fundId)?.name ?? 'Fund'
  }, [fundId, funds])

  const setFundIdCb = useCallback((id: string) => {
    setPrefs((p) => ({ ...p, fundId: id }))
  }, [])

  const setPersonaCb = useCallback((p: PersonaId) => {
    setPrefs((prev) => ({ ...prev, persona: p }))
  }, [])

  const setColorSchemeCb = useCallback((s: ColorScheme) => {
    setColorSchemeState(s)
  }, [])

  const toggleColorScheme = useCallback(() => {
    setColorSchemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  useEffect(() => {
    setApiActorHeadersProvider(() => ({
      name: PERSONA_LABEL[persona],
      persona,
    }))
    return () => setApiActorHeadersProvider(null)
  }, [persona])

  const value = useMemo(
    () => ({
      fundId,
      setFundId: setFundIdCb,
      fundName,
      funds,
      fundsLoading,
      fundsLoadError,
      dismissFundsLoadError,
      refreshFunds,
      persona,
      setPersona: setPersonaCb,
      colorScheme,
      setColorScheme: setColorSchemeCb,
      toggleColorScheme,
    }),
    [
      fundId,
      fundName,
      funds,
      fundsLoading,
      fundsLoadError,
      dismissFundsLoadError,
      refreshFunds,
      persona,
      setFundIdCb,
      setPersonaCb,
      colorScheme,
      setColorSchemeCb,
      toggleColorScheme,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider missing')
  return ctx
}
