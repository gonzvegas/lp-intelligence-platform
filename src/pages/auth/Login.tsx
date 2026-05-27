import { InteractionStatus } from '@azure/msal-browser'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useEffect, type ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { getEntraConfigured, isAuthBypassed, loginRequest } from '../../auth/msalConfig'
import { Button } from '../../components/ui'

function safeReturnPath(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

function LoginShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-muted)]">
      <Helmet>
        <title>{title}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 text-[var(--color-ink)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]">
              <BookOpen size={17} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-bold">LP Intelligence</span>
          </Link>
          <Link
            className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            to="/"
          >
            Marketing home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-12">
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{subtitle}</p> : null}
        <div className="mt-8 space-y-4">{children}</div>
      </main>
    </div>
  )
}

function LoginDevFallback() {
  const navigate = useNavigate()
  const bypass = isAuthBypassed()
  return (
    <LoginShell
      title={bypass ? 'Authentication disabled for development' : 'Sign-in not configured'}
      subtitle={
        bypass
          ? 'VITE_AUTH_DISABLED is enabled. The application shell is unlocked without Azure AD.'
          : 'Set VITE_ENTRA_CLIENT_ID and VITE_ENTRA_AUTHORITY in your environment (see .env.example), then reload.'
      }
    >
      <Button
        variant="primary"
        className="w-full justify-center py-3"
        type="button"
        onClick={() => {
          navigate('/dashboard')
        }}
      >
        Continue to dashboard
      </Button>
      <p className="text-center text-xs text-[var(--color-ink-muted)]">
        For production, unset <code className="rounded bg-[var(--color-surface)] px-1">VITE_AUTH_DISABLED</code>{' '}
        and configure Microsoft Entra.
      </p>
    </LoginShell>
  )
}

function LoginMsal() {
  const { instance, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()

  useEffect(() => {
    void instance.handleRedirectPromise().catch(() => {
      /* user cancelled or malformed hash — stay on login */
    })
  }, [instance])

  const busy = inProgress !== InteractionStatus.None

  const returnTo = safeReturnPath((location.state as { returnTo?: string } | null)?.returnTo)

  if (!busy && isAuthenticated) {
    return <Navigate to={returnTo} replace />
  }

  return (
    <LoginShell title="Sign in" subtitle="Use your Microsoft Entra identity to access LP Intelligence.">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <p className="text-sm text-[var(--color-ink-muted)]">
          You will be redirected to Microsoft sign-in for your organization&apos;s tenant.
        </p>
        <Button
          variant="primary"
          className="mt-6 w-full justify-center py-3"
          type="button"
          disabled={busy}
          onClick={() => {
            void instance.loginRedirect(loginRequest())
          }}
        >
          {busy ? 'Signing you in…' : 'Continue with Microsoft'}
        </Button>
      </div>
      <p className="text-center text-xs text-[var(--color-ink-muted)]">
        Prefer Google SSO? Connect Google as an external IdP in Entra tenant federation, then reuse this flow—no
        code change needed here beyond Entra setup.
      </p>
    </LoginShell>
  )
}

/** OAuth redirect landing (Entra SPA redirect URI = /login). */
export function Login() {
  if (isAuthBypassed() || !getEntraConfigured()) {
    return <LoginDevFallback />
  }

  return <LoginMsal />
}
