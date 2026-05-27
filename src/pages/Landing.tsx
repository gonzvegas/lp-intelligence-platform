import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  FileSearch,
  FileStack,
  Gauge,
  GitMerge,
  Inbox,
  Layers,
  PieChart,
  Radar,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import { getPublicSiteUrl } from '../seo/siteUrl'
import { cx } from '../util/cx'

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-[var(--color-accent)] text-white transition duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] motion-reduce:hover:scale-100 motion-reduce:active:scale-100'

export function Landing() {
  const site = getPublicSiteUrl()
  const title = 'LP Intelligence Platform · LP agreements, precedence & deal screening'
  const description =
    'Unify LP agreements and instruments—then track holdings per LP with bulk uploads, sector concentration versus fund committed capital, extraction with citations, precedence, and deal screening grounded in negotiated language.'
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LP Intelligence Platform',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description,
    url: site,
    publisher: {
      '@type': 'Organization',
      name: 'LP Intelligence Platform',
      url: site,
    },
  })

  const painPoints = [
    {
      icon: Inbox,
      title: 'Agreements scattered across systems',
      pain:
        'Side letters, LPAs, and co-invest terms sit in CRM folders, email, and drives—so teams keyword-hunt and still miss negotiated nuance.',
      relief: 'One searchable corpus with semantic retrieval tied to the actual executed documents.',
    },
    {
      icon: FileSearch,
      title: 'Re-reading the same PDFs for every deal',
      pain:
        'Each new opportunity means opening the same long PDFs; restrictions aren’t reusable objects with stable citations.',
      relief: 'Extract and structure restrictions with page- and clause-level provenance you can trust in diligence.',
    },
    {
      icon: GitMerge,
      title: 'Precedence fights and “tribal knowledge”',
      pain:
        'Which instrument wins for an LP—side letter vs ERISA letter vs co-invest vs LPA—is argued in threads, not a system of record.',
      relief: 'Deterministic precedence stacks per LP and fund before you screen or write the IC memo.',
    },
    {
      icon: Users,
      title: 'Inconsistent answers across legal, IR, and compliance',
      pain:
        'Different teams quote different excerpts; investors and deal partners get conflicting messages about what was agreed.',
      relief: 'Shared workspace and obligation-style outputs so everyone works from the same negotiated ground truth.',
    },
    {
      icon: ShieldCheck,
      title: 'Audit and exam prep built from screenshots',
      pain:
        'When regulators, LPs, or buyers ask “show your work,” evidence is a patchwork of files and forwards—not a defensible trail.',
      relief: 'Structured reviews, sign-off states, and exports that reconcile to how you already run compliance.',
    },
    {
      icon: Gauge,
      title: 'Screening is either slow or dangerously thin',
      pain:
        'Full legal review bottlenecks the pipeline; shortcuts mean deals get screened on memory instead of language.',
      relief: 'Fast, repeatable screening grounded in each LP’s negotiated restrictions—with human-in-the-loop control.',
    },
    {
      icon: PieChart,
      title: 'Blind spots on holdings, sleeves, and concentration',
      pain:
        'Cap tables show commitments—not how each LP’s capital is deployed by sector or name. Spreadsheets of positions go stale right when concentration limits matter.',
      relief:
        'Track holdings per LP, bulk-upload line items across names and sectors, and reconcile sector exposure against total committed capital to the fund in one roll-up.',
    },
  ] as const

  return (
    <div className="min-h-screen bg-[var(--color-surface-muted)]">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`${site}/`} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${site}/`} />
        <meta name="twitter:card" content="summary_large_image" />

        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5 transition-transform duration-300 hover:scale-[1.02] motion-reduce:hover:scale-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]">
              <BookOpen size={17} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--color-ink)]">LP Intelligence</div>
              <div className="text-[11px] text-[var(--color-ink-muted)]">Agreement intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] transition-colors duration-200 hover:bg-[var(--color-surface-muted)]"
              to="/login"
            >
              Log in
            </Link>
            <Link
              to="/login"
              className={cx(btnPrimary, 'h-9 px-3.5 py-2 text-sm')}
            >
              Open app <ArrowRight size={14} className="ml-1 inline" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[var(--color-border)]">
          {/* Gradient wash */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-accent-muted)]/50 via-transparent to-transparent dark:from-[var(--color-accent-muted)]/18"
          />
          {/* Animated orbs */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden landing-orbs-wrap">
            <div className="absolute -left-[18%] -top-[32%] h-[min(85vw,520px)] w-[min(85vw,520px)] rounded-full bg-[var(--color-accent)]/[0.11] blur-[100px]" />
            <div className="absolute -bottom-[26%] -right-[14%] h-[min(75vw,440px)] w-[min(75vw,440px)] rounded-full bg-[var(--color-accent)]/[0.08] blur-[90px]" />
          </div>
          {/* Drifting grid */}
          <div
            aria-hidden
            className="landing-grid-shift pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(90deg, var(--color-ink) 1px, transparent 1px), linear-gradient(var(--color-ink) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          {/* Decorative stroke */}
          <svg
            aria-hidden
            className="landing-hero-line pointer-events-none absolute right-[-4%] top-[18%] hidden w-[min(42vw,380px)] text-[var(--color-accent)] xl:block"
            viewBox="0 0 400 260"
            fill="none"
          >
            <path
              d="M 12 220 Q 210 28 388 118"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>

          <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24">
            <p className="landing-rise-1 relative mb-4 inline-flex overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
              <span
                aria-hidden
                className="landing-badge-shimmer pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
              />
              <span className="relative z-10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
                ingest → embed → extract → screen
              </span>
            </p>
            <h1 className="landing-rise-2 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-[var(--color-ink)] sm:text-5xl">
              Turn LP legal documents into searchable, prioritized restrictions for screening and compliance.
            </h1>
            <p className="landing-rise-3 mt-5 max-w-2xl text-lg text-[var(--color-ink-muted)]">
              Stop losing diligence in inbox threads. Structured ingestion, Claude-powered extraction from PDFs,
              precedence stacks per LP, and Obligations + Screening tied to negotiated language—plus{' '}
              <strong className="font-semibold text-[var(--color-ink)]">
                bulk-uploaded holdings per LP
              </strong>{' '}
              so sector concentration is visible{' '}
              <strong className="font-semibold text-[var(--color-ink)]">against committed capital</strong>{' '}
              to the fund.
            </p>
            <div className="landing-rise-4 mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className={cx(btnPrimary, 'min-h-[44px] px-8 py-2 text-base shadow-md shadow-[var(--color-accent)]/25')}
              >
                Get started
              </Link>
              <span className="landing-rise-5 flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                <span
                  aria-hidden
                  className="landing-pulse-dot inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]"
                />
                SOC2‑ready SSO path · Google &amp; Entra‑backed identities
              </span>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/80 py-14 dark:bg-[var(--color-surface-muted)]/50">
          <div className="mx-auto max-w-3xl px-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-[1.65rem]">
                Common pain points we solve
              </h2>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                Eight themes we hear repeatedly—tap to expand details.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3">
              {painPoints.map(({ icon: Icon, title, pain, relief }) => (
                <details key={title} className="landing-pain-details group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm open:border-[var(--color-accent)]/25 open:shadow-md">
                  <summary className="landing-pain-summary flex cursor-pointer list-none items-center gap-4 rounded-2xl px-4 py-3.5 text-left outline-none ring-inset transition hover:bg-[var(--color-surface-muted)]/80 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 sm:px-5 sm:py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
                      <Icon size={20} strokeWidth={1.85} aria-hidden />
                    </div>
                    <span className="min-w-0 flex-1 text-base font-semibold leading-snug text-[var(--color-ink)]">{title}</span>
                    <ChevronDown
                      size={18}
                      className="landing-pain-chevron shrink-0 text-[var(--color-ink-muted)]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </summary>
                  <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3 sm:px-5">
                    <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">{pain}</p>
                    <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm font-medium leading-relaxed text-[var(--color-ink)]">
                      <span className="text-[var(--color-accent)]">We help: </span>
                      {relief}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div className="sm:col-span-2 lg:col-span-4">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Where we focus in the product</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-muted)]">
              Agreements, holdings roll-up—bulk positions per LP and concentration vs committed capital—and screening grounded in negotiated language.
            </p>
          </div>
          <div className="landing-rise-6 landing-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)]/30 hover:shadow-lg motion-reduce:hover:translate-y-0">
            <div className="landing-icon-nudge text-[var(--color-accent)]">
              <FileStack size={22} aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Fragmentation</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              Agreements live in DealCloud‑style hubs, Teams, drives, email. Searching &quot;pension&quot; versus
              &quot;pension-linked&quot; blows reviews.
            </p>
          </div>
          <div className="landing-rise-7 landing-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)]/30 hover:shadow-lg motion-reduce:hover:translate-y-0">
            <div className="landing-icon-nudge text-[var(--color-accent)]">
              <Layers size={22} aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Precedence</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              Side letter vs ERISA letter vs co‑invest vs fund LPA—you need deterministic stack order before you screen
              a deal—not Post‑Its.
            </p>
          </div>
          <div className="landing-rise-10 landing-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)]/30 hover:shadow-lg motion-reduce:hover:translate-y-0">
            <div className="landing-icon-nudge text-[var(--color-accent)]">
              <PieChart size={22} aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Holdings &amp; concentration</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              Bulk-upload line items per LP across names and sectors. See sleeves and tails against{' '}
              <strong className="font-semibold text-[var(--color-ink)]">total committed capital</strong> so concentration
              tests line up with the fund economics you actually manage—not a static spreadsheet.
            </p>
          </div>
          <div className="landing-rise-8 landing-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)]/30 hover:shadow-lg motion-reduce:hover:translate-y-0 sm:col-span-1">
            <div className="landing-icon-nudge text-[var(--color-accent)]">
              <Radar size={22} aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Screening</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              Legal wants clause‑level cites; Deal teams want velocity. Screening needs both with human‑in‑the‑loop
              review—not black boxes.
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[20%] top-1/2 h-[320px] w-[320px] -translate-y-1/2 rounded-full bg-[var(--color-accent-muted)]/40 blur-3xl dark:bg-[var(--color-accent-muted)]/15"
          />
          <div className="relative mx-auto max-w-5xl px-6">
            <div className="landing-rise-9 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Operational pipeline</h2>
                <p className="mt-2 max-w-xl text-sm text-[var(--color-ink-muted)]">
                  Agreements, NLP extraction, bulk holdings ingestion, structured reviews—outputs you can reconcile to Excel,
                  audits, and IC workflows.
                </p>
              </div>
              <Zap size={28} className="landing-zap-pulse text-[var(--color-accent)] opacity-75" aria-hidden />
            </div>
            <ol className="landing-pipeline-list mt-10 grid gap-4 font-mono text-xs sm:grid-cols-2 xl:grid-cols-5">
              {[
                'Upload agreements or sync CRM',
                'Vector index + extract restrictions',
                'Bulk-upload holdings per LP',
                'Sector roll-up vs committed capital',
                'Screen deals vs negotiated terms',
              ].map((step, idx) => (
                <li
                  key={step}
                  className="landing-pipeline-step rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/25 hover:shadow-md motion-reduce:hover:translate-y-0"
                >
                  <span className="text-[10px] font-bold text-[var(--color-accent)]">0{idx + 1}</span>
                  <p className="mt-2 font-sans text-sm font-medium text-[var(--color-ink)]">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] py-10 text-center text-xs text-[var(--color-ink-muted)]">
          <p>LP Intelligence Platform — enterprise SSO via Microsoft Entra External ID (&amp; Google federation).</p>
        </footer>
      </main>
    </div>
  )
}
