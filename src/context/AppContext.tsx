import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Fund, PersonaId } from '../domain/types'
import { api } from '../api/client'

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
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(loadTheme)

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
    let m = true
    ;(async () => {
      setFundsLoading(true)
      try {
        const rows = await api.listFunds()
        if (!m) return
        setFunds(rows)
        setPrefs((p) => {
          const nextId = reconcileFundId(rows, p.fundId)
          if (nextId === p.fundId) return p
          return { ...p, fundId: nextId }
        })
      } finally {
        if (m) setFundsLoading(false)
      }
    })()
    return () => {
      m = false
    }
  }, [reconcileFundId])

  const refreshFunds = useCallback(async () => {
    const rows = await api.listFunds()
    setFunds(rows)
    setPrefs((p) => {
      const nextId = reconcileFundId(rows, p.fundId)
      if (nextId === p.fundId) return p
      return { ...p, fundId: nextId }
    })
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

  const value = useMemo(
    () => ({
      fundId,
      setFundId: setFundIdCb,
      fundName,
      funds,
      fundsLoading,
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
