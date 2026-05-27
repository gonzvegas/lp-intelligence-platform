import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react'
import { getEntraConfigured, isAuthBypassed } from '../auth/msalConfig'

/** Ensures this subtree only renders under MSAL (hooks require provider). */
function AuthenticatedGate({ returnTo }: { returnTo: string }) {
  return (
    <>
      <AuthenticatedTemplate>
        <Outlet />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <Navigate to="/login" replace state={{ returnTo }} />
      </UnauthenticatedTemplate>
    </>
  )
}

export function ProtectedRoute() {
  const location = useLocation()
  const bypass = isAuthBypassed()
  const entra = getEntraConfigured()
  const returnTo = `${location.pathname}${location.search}`

  if (bypass || !entra) return <Outlet />
  return <AuthenticatedGate returnTo={returnTo} />
}
