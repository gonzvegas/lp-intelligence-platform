import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { EventType, type AuthenticationResult, PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { buildMsalConfig, getEntraConfigured } from './msalConfig'
import { ApiAuthBridge } from './ApiAuthBridge'
import { setApiAccessTokenProvider } from '../api/client'

/**
 * Mounts MSAL when Entra env is set and waits for PCA.initialize().
 * Fragment-only when Entra is not configured.
 */
export function MsalProviderWrapper({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)

  const instance = useMemo(() => {
    if (!getEntraConfigured() || typeof window === 'undefined') return null
    const cfg = buildMsalConfig(window.location.origin)
    if (!cfg) return null
    const pca = new PublicClientApplication(cfg)
    pca.addEventCallback((ev) => {
      if (ev.eventType !== EventType.LOGIN_SUCCESS || !ev.payload) return
      const result = ev.payload as AuthenticationResult
      if (result.account) {
        pca.setActiveAccount(result.account)
      }
    })
    return pca
  }, [])

  useEffect(() => {
    if (!instance) return
    let cancel = false
    void instance
      .initialize()
      .then(() => {
        if (cancel) return
        const acct = instance.getAllAccounts()
        if (acct.length > 0) instance.setActiveAccount(acct[0])
      })
      .catch(() => {
        /* still render app shell so misconfiguration is observable */
      })
      .finally(() => {
        if (!cancel) setInitialized(true)
      })
    return () => {
      cancel = true
    }
  }, [instance])

  useEffect(() => {
    if (!instance) setApiAccessTokenProvider(null)
  }, [instance])

  if (!instance) return <>{children}</>

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] text-sm text-[var(--color-ink-muted)]">
        Preparing sign-in…
      </div>
    )
  }

  return (
    <MsalProvider instance={instance}>
      <ApiAuthBridge />
      {children}
    </MsalProvider>
  )
}
