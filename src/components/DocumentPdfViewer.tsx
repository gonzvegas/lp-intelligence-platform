import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { api } from '../api/client'
import { findClauseInPdf, type HighlightRect } from '../domain/pdfTextHighlight'
import { Button } from './ui'

import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

function isPdfBuffer(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false
  const b = new Uint8Array(data.slice(0, 4))
  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 // %PDF
}

function pageRenderWidth(): number {
  return Math.min(typeof window !== 'undefined' ? window.innerWidth - 96 : 720, 900)
}

type Props = {
  documentId: string
  title?: string
  page?: number
  highlightClause?: string
  className?: string
}

type HighlightStatus = 'idle' | 'searching' | 'found' | 'not-found'

export function DocumentPdfViewer({
  documentId,
  title,
  page,
  highlightClause,
  className,
}: Props) {
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [useNativeViewer, setUseNativeViewer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [clauseMatch, setClauseMatch] = useState<{ pageNumber: number; rects: HighlightRect[] } | null>(
    null,
  )
  const [highlightStatus, setHighlightStatus] = useState<HighlightStatus>('idle')
  const firstHighlightRef = useRef<HTMLDivElement>(null)

  const renderWidth = pageRenderWidth()

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    setLoading(true)
    setError(null)
    setRenderError(null)
    setUseNativeViewer(false)
    setFileData(null)
    setBlobUrl(null)
    setPdfDocument(null)
    setClauseMatch(null)
    setHighlightStatus('idle')
    ;(async () => {
      try {
        const blob = await api.fetchDocumentPdfBlob(documentId)
        if (!active) return
        const buf = await blob.arrayBuffer()
        if (!isPdfBuffer(buf)) {
          throw new Error('Downloaded file is not a valid PDF')
        }
        objectUrl = window.URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }))
        setFileData(buf)
        setBlobUrl(objectUrl)
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Could not load PDF')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [documentId])

  useEffect(() => {
    if (page && page > 0) setCurrentPage(page)
  }, [page, documentId])

  useEffect(() => {
    if (!pdfDocument || !highlightClause || useNativeViewer) {
      setClauseMatch(null)
      setHighlightStatus('idle')
      return
    }

    let cancelled = false
    setHighlightStatus('searching')

    ;(async () => {
      const match = await findClauseInPdf(pdfDocument, highlightClause, page, renderWidth)
      if (cancelled) return
      if (match) {
        setClauseMatch(match)
        setCurrentPage(match.pageNumber)
        setHighlightStatus('found')
      } else {
        setClauseMatch(null)
        setHighlightStatus('not-found')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pdfDocument, highlightClause, page, documentId, useNativeViewer, renderWidth])

  useEffect(() => {
    if (highlightStatus !== 'found' || !clauseMatch) return
    const timer = window.setTimeout(() => {
      firstHighlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [highlightStatus, clauseMatch, currentPage])

  const fileSource = useMemo(() => (fileData ? { data: fileData } : null), [fileData])

  const activeHighlights =
    clauseMatch && clauseMatch.pageNumber === currentPage ? clauseMatch.rects : []
  const showHighlights = activeHighlights.length > 0

  const header = (
    <>
      {title ? (
        <p className="mb-2 text-xs font-medium text-[var(--color-ink-muted)]">{title}</p>
      ) : null}
      {highlightClause ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <span className="font-semibold uppercase tracking-wide text-amber-800">Extracted clause · </span>
          <span className="italic">“{highlightClause}”</span>
        </div>
      ) : null}
      {highlightClause && highlightStatus === 'searching' ? (
        <p className="mb-2 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <Loader2 size={12} className="animate-spin" />
          Locating clause in PDF…
        </p>
      ) : null}
      {highlightClause && highlightStatus === 'not-found' ? (
        <p className="mb-2 text-xs text-amber-800">
          Could not locate exact text in the PDF — refer to the extracted clause above.
        </p>
      ) : null}
      {showHighlights ? (
        <p className="mb-2 text-xs text-emerald-800">
          Highlighted on page {currentPage}.
        </p>
      ) : null}
    </>
  )

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 py-12 text-sm text-[var(--color-ink-muted)] ${className ?? ''}`}
      >
        <Loader2 size={16} className="animate-spin" />
        Loading source PDF…
      </div>
    )
  }

  if (error || !fileSource || !blobUrl) {
    return (
      <div className={className}>
        {header}
        <div className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-ink-muted)]">
          <FileText size={20} className="mx-auto mb-2 opacity-50" />
          {error ?? 'PDF not available'}
        </div>
      </div>
    )
  }

  const nativeSrc =
    currentPage > 1 ? `${blobUrl}#page=${currentPage}` : blobUrl

  if (useNativeViewer) {
    return (
      <div className={className}>
        {header}
        <p className="mb-2 text-xs text-[var(--color-ink-muted)]">
          Using browser PDF viewer{currentPage > 1 ? ` · page ${currentPage}` : ''}.
        </p>
        <iframe
          title={title ?? 'Source PDF'}
          src={nativeSrc}
          className="h-[min(70vh,720px)] w-full rounded-lg border border-[var(--color-border)] bg-white"
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {header}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-ink-muted)]">
          Page {currentPage}{numPages > 0 ? ` of ${numPages}` : ''}
        </p>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            type="button"
            className="px-2 py-1"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="secondary"
            type="button"
            className="px-2 py-1"
            disabled={numPages > 0 && currentPage >= numPages}
            onClick={() => setCurrentPage((p) => (numPages > 0 ? Math.min(numPages, p + 1) : p + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {renderError ? (
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Advanced viewer unavailable ({renderError}). Showing browser PDF viewer instead.
        </div>
      ) : null}

      <div className="overflow-auto rounded-lg border border-[var(--color-border)] bg-neutral-100 p-2">
        {renderError ? (
          <iframe
            title={title ?? 'Source PDF'}
            src={nativeSrc}
            className="h-[min(70vh,720px)] w-full rounded-lg bg-white"
          />
        ) : (
          <Document
            file={fileSource}
            onLoadSuccess={(pdf) => {
              setNumPages(pdf.numPages)
              setPdfDocument(pdf)
            }}
            onLoadError={(e) => {
              const msg = e?.message ?? 'PDF.js failed'
              setRenderError(msg)
              setUseNativeViewer(true)
            }}
            loading={
              <div className="flex justify-center py-12 text-sm text-[var(--color-ink-muted)]">
                Rendering PDF…
              </div>
            }
          >
            <div className="relative inline-block">
              <Page
                pageNumber={currentPage}
                width={renderWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderError={(e) => {
                  setRenderError(e?.message ?? 'Page render failed')
                  setUseNativeViewer(true)
                }}
              />
              {showHighlights ? (
                <div className="pointer-events-none absolute inset-0">
                  {activeHighlights.map((rect, i) => (
                    <div
                      key={`${rect.left}-${rect.top}-${i}`}
                      ref={i === 0 ? firstHighlightRef : undefined}
                      className="absolute rounded-sm bg-amber-400/50 ring-1 ring-amber-600/50"
                      style={{
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </Document>
        )}
      </div>
    </div>
  )
}
