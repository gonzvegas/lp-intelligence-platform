import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

const FlashContext = createContext<((msg: string) => void) | null>(null)

export function FlashProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((msg: string) => {
    setMessage(msg)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setMessage(null)
      timerRef.current = null
    }, 4200)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <FlashContext.Provider value={flash}>
      {children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)] px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
        >
          {message}
        </div>
      ) : null}
    </FlashContext.Provider>
  )
}

export function useFlash(): (msg: string) => void {
  const fn = useContext(FlashContext)
  if (!fn) throw new Error('FlashProvider missing')
  return fn
}
