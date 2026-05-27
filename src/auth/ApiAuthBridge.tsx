import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { useMsal } from '@azure/msal-react'
import { useEffect } from 'react'
import { setApiAccessTokenProvider } from '../api/client'
import { getEntraConfigured, isAuthBypassed, loginRequest } from './msalConfig'

/**
 * Registers a silent-token provider so `fetch` to FastAPI can send `Authorization: Bearer`
 * when JWT validation is enabled. Renders nothing.
 */
export function ApiAuthBridge() {
  const { instance } = useMsal()

  useEffect(() => {
    if (!getEntraConfigured() || isAuthBypassed()) {
      setApiAccessTokenProvider(null)
      return () => setApiAccessTokenProvider(null)
    }

    const req = loginRequest()
    const scopes = req.scopes?.length ? req.scopes : ['openid', 'profile']

    setApiAccessTokenProvider(async () => {
      const acct = instance.getActiveAccount() ?? instance.getAllAccounts()[0]
      if (!acct) return null
      try {
        const r = await instance.acquireTokenSilent({
          scopes,
          account: acct,
        })
        return r.accessToken ?? null
      } catch (e) {
        if (e instanceof InteractionRequiredAuthError) return null
        return null
      }
    })

    return () => setApiAccessTokenProvider(null)
  }, [instance])

  return null
}
