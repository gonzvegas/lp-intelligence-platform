import type { Configuration, RedirectRequest } from '@azure/msal-browser'

function trimEnv(v: string | undefined): string | undefined {
  const t = v?.trim()
  return t && t.length > 0 ? t : undefined
}

export function getEntraConfigured(): boolean {
  return Boolean(trimEnv(import.meta.env.VITE_ENTRA_CLIENT_ID) && trimEnv(import.meta.env.VITE_ENTRA_AUTHORITY))
}

/** Dev escape hatch: behave as signed-in without MSAL redirect. */
export function isAuthBypassed(): boolean {
  return String(import.meta.env.VITE_AUTH_DISABLED ?? '').trim() === 'true'
}

export function buildMsalConfig(appOrigin: string): Configuration | null {
  const clientId = trimEnv(import.meta.env.VITE_ENTRA_CLIENT_ID)
  const authority = trimEnv(import.meta.env.VITE_ENTRA_AUTHORITY)
  if (!clientId || !authority) return null

  const origin = appOrigin.replace(/\/$/, '')

  return {
    auth: {
      clientId,
      authority,
      redirectUri: `${origin}/login`,
      postLogoutRedirectUri: `${origin}/`,
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  }
}

export function loginRequest(): RedirectRequest {
  const apiScope = trimEnv(import.meta.env.VITE_ENTRA_API_SCOPE)
  const scopes = apiScope
    ? ['openid', 'profile', 'offline_access', apiScope]
    : ['openid', 'profile', 'offline_access']
  return { scopes }
}
