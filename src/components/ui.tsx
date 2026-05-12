import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../util/cx'

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm',
        className,
      )}
    >
      {(title || subtitle || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            {title ? (
              <h2 className="text-base font-semibold text-[var(--color-ink)]">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  className?: string
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50'
  const styles = {
    primary:
      'bg-[var(--color-accent)] text-white hover:brightness-110 focus-visible:outline-[var(--color-accent)]',
    secondary:
      'border border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]',
    ghost:
      'text-[var(--color-ink)] hover:bg-[var(--color-accent-muted)]/60',
    danger:
      'bg-[var(--color-danger)] text-white hover:brightness-110 focus-visible:outline-[var(--color-danger)]',
  }
  return (
    <button
      type="button"
      className={cx(base, styles[variant], className)}
      {...props}
    />
  )
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
  children: ReactNode
  className?: string
}) {
  const tones = {
    neutral:
      'bg-[var(--color-surface-muted)] text-[var(--color-ink)] ring-1 ring-[var(--color-border)]',
    success:
      'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900',
    warning:
      'bg-amber-50 text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900',
    danger:
      'bg-red-50 text-red-950 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900',
    accent:
      'bg-[var(--color-accent-muted)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/25',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  hint,
}: {
  title: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
      {hint ? (
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}
