import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PersonaId } from '../domain/types'
import { funds } from '../mocks/fixtures'

const STORAGE_KEY = 'lip.shell.demoPrefs'

const PERSONAS: PersonaId[] = ['gp', 'compliance', 'ir', 'legal', 'admin']

function loadInitialPrefs(): { fundId: string; persona: PersonaId } {
  const defaultFund = funds[0]?.id ?? 'fund-1'
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { fundId: defaultFund, persona: 'gp' }
    const j = JSON.parse(raw) as { fundId?: string; persona?: string }
    const persona =
      j.persona && PERSONAS.includes(j.persona as PersonaId)
        ? (j.persona as PersonaId)
        : 'gp'
    const fundId =
      j.fundId && funds.some((f) => f.id === j.fundId) ? j.fundId : defaultFund
    return { fundId, persona }
  } catch {
    return { fundId: defaultFund, persona: 'gp' }
  }
}

interface AppContextValue {
  fundId: string
  setFundId: (id: string) => void
  fundName: string
  persona: PersonaId
  setPersona: (p: PersonaId) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [{ fundId, persona }, setPrefs] = useState(loadInitialPrefs)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ fundId, persona }))
  }, [fundId, persona])

  const fundName = useMemo(
    () => funds.find((f) => f.id === fundId)?.name ?? 'Fund',
    [fundId],
  )

  const setFundIdCb = useCallback((id: string) => {
    setPrefs((p) => ({ ...p, fundId: id }))
  }, [])

  const setPersonaCb = useCallback((p: PersonaId) => {
    setPrefs((prev) => ({ ...prev, persona: p }))
  }, [])

  const value = useMemo(
    () => ({
      fundId,
      setFundId: setFundIdCb,
      fundName,
      persona,
      setPersona: setPersonaCb,
    }),
    [fundId, fundName, persona, setFundIdCb, setPersonaCb],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider missing')
  return ctx
}
