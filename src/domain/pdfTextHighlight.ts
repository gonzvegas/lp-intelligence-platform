import { Util, type PDFDocumentProxy, type PageViewport } from 'pdfjs-dist'

export type HighlightRect = {
  left: number
  top: number
  width: number
  height: number
}

export type ClauseMatchResult = {
  pageNumber: number
  rects: HighlightRect[]
}

type PdfTextItem = {
  str: string
  transform: number[]
  width: number
  height: number
}

function isTextItem(item: unknown): item is PdfTextItem {
  return typeof item === 'object' && item !== null && 'str' in item
}

export function normalizeForPdfSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function stripPunctuation(text: string): string {
  return text.replace(/[^\w\s']/g, ' ').replace(/\s+/g, ' ').trim()
}

function significantWords(text: string): string[] {
  return stripPunctuation(normalizeForPdfSearch(text))
    .split(' ')
    .filter((w) => w.length > 2)
}

function buildSearchNeedles(clauseText: string): string[] {
  const normalized = normalizeForPdfSearch(clauseText)
  const needles = new Set<string>()
  if (normalized.length >= 8) needles.add(normalized)

  const words = normalized.split(' ').filter(Boolean)
  if (words.length > 4) {
    needles.add(words.slice(0, Math.min(16, words.length)).join(' '))
    needles.add(words.slice(0, 10).join(' '))
    needles.add(words.slice(0, 6).join(' '))
  }

  if (normalized.length > 100) {
    needles.add(normalized.slice(0, 80))
    const sig = significantWords(clauseText)
    if (sig.length >= 6) {
      needles.add(sig.slice(0, 12).join(' '))
      needles.add(sig.slice(0, 8).join(' '))
    }
  }

  return [...needles].filter((n) => n.length >= 8)
}

type PageTextIndex = {
  text: string
  compact: string
  compactToItem: number[]
  itemRanges: { start: number; end: number; itemIndex: number }[]
  wordTokens: { word: string; itemIndex: number }[]
}

function buildPageTextIndex(items: PdfTextItem[]): PageTextIndex {
  let text = ''
  let compact = ''
  const compactToItem: number[] = []
  const itemRanges: PageTextIndex['itemRanges'] = []
  const wordTokens: PageTextIndex['wordTokens'] = []

  for (let i = 0; i < items.length; i++) {
    const piece = normalizeForPdfSearch(items[i].str)
    if (!piece) continue

    if (text.length > 0) text += ' '
    const start = text.length
    text += piece
    itemRanges.push({ start, end: text.length, itemIndex: i })

    for (const ch of piece.replace(/\s+/g, '')) {
      compact += ch
      compactToItem.push(i)
    }

    for (const word of piece.split(' ').filter(Boolean)) {
      if (word.length > 2) wordTokens.push({ word, itemIndex: i })
    }
  }

  return { text, compact, compactToItem, itemRanges, wordTokens }
}

function itemSpanFromTextRange(
  itemRanges: PageTextIndex['itemRanges'],
  start: number,
  end: number,
): { itemStart: number; itemEnd: number } | null {
  const matched = itemRanges.filter((range) => range.end > start && range.start < end)
  if (matched.length === 0) return null
  const itemStart = Math.min(...matched.map((r) => r.itemIndex))
  const itemEnd = Math.max(...matched.map((r) => r.itemIndex)) + 1
  return { itemStart, itemEnd }
}

function itemSpanFromCompactRange(
  compactToItem: number[],
  start: number,
  end: number,
): { itemStart: number; itemEnd: number } | null {
  if (start >= end || start >= compactToItem.length) return null
  const slice = compactToItem.slice(start, Math.min(end, compactToItem.length))
  if (slice.length === 0) return null
  return { itemStart: Math.min(...slice), itemEnd: Math.max(...slice) + 1 }
}

type TextSpan =
  | { mode: 'text'; start: number; end: number }
  | { mode: 'compact'; start: number; end: number }

function findNeedleSpan(index: PageTextIndex, needles: string[]): TextSpan | null {
  for (const needle of needles) {
    const idx = index.text.indexOf(needle)
    if (idx >= 0) return { mode: 'text', start: idx, end: idx + needle.length }
  }

  const cleanNeedles = needles.map(stripPunctuation).filter((n) => n.length >= 8)
  const cleanHaystack = stripPunctuation(index.text)
  for (const needle of cleanNeedles) {
    const idx = cleanHaystack.indexOf(needle)
    if (idx >= 0) {
      const hayWords = cleanHaystack.split(' ')
      let charPos = 0
      let wordStart = 0
      for (let w = 0; w < hayWords.length; w++) {
        const word = hayWords[w]
        if (charPos + word.length > idx) {
          wordStart = w
          break
        }
        charPos += word.length + 1
      }
      const needleWords = needle.split(' ').filter(Boolean)
      const mappedWords = hayWords.slice(wordStart, wordStart + needleWords.length).join(' ')
      const mappedIdx = index.text.indexOf(mappedWords)
      if (mappedIdx >= 0) return { mode: 'text', start: mappedIdx, end: mappedIdx + mappedWords.length }
    }
  }

  for (const needle of needles) {
    const compactNeedle = needle.replace(/\s+/g, '')
    if (compactNeedle.length < 8) continue
    const idx = index.compact.indexOf(compactNeedle)
    if (idx >= 0) return { mode: 'compact', start: idx, end: idx + compactNeedle.length }
  }

  return null
}

function findWordSequenceSpan(
  pageTokens: PageTextIndex['wordTokens'],
  queryWords: string[],
): { itemStart: number; itemEnd: number } | null {
  const minRun = Math.min(5, queryWords.length)
  for (let runLen = queryWords.length; runLen >= minRun; runLen--) {
    for (let offset = 0; offset <= queryWords.length - runLen; offset++) {
      const phrase = queryWords.slice(offset, offset + runLen)
      outer: for (let i = 0; i <= pageTokens.length - phrase.length; i++) {
        for (let j = 0; j < phrase.length; j++) {
          if (pageTokens[i + j]?.word !== phrase[j]) continue outer
        }
        const indices = pageTokens.slice(i, i + phrase.length).map((t) => t.itemIndex)
        return { itemStart: Math.min(...indices), itemEnd: Math.max(...indices) + 1 }
      }
    }
  }
  return null
}

function itemRectsForSpan(
  items: PdfTextItem[],
  itemStart: number,
  itemEnd: number,
  viewport: PageViewport,
): HighlightRect[] {
  const rects: HighlightRect[] = []

  for (let i = itemStart; i < itemEnd; i++) {
    const item = items[i]
    const tx = Util.transform(viewport.transform, item.transform)
    const fontHeight = Math.hypot(tx[2], tx[3])
    const left = tx[4]
    const top = tx[5] - fontHeight
    const width = Math.max(item.width * viewport.scale, 2)
    const height = Math.max(fontHeight * 1.15, 4)
    rects.push({ left, top, width, height })
  }

  return rects
}

async function findOnPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  needles: string[],
  queryWords: string[],
  renderWidth: number,
): Promise<ClauseMatchResult | null> {
  const pdfPage = await pdf.getPage(pageNumber)
  const baseViewport = pdfPage.getViewport({ scale: 1 })
  const scale = renderWidth / baseViewport.width
  const viewport = pdfPage.getViewport({ scale })
  const textContent = await pdfPage.getTextContent()
  const items: PdfTextItem[] = []
  for (const item of textContent.items) {
    if (isTextItem(item)) items.push(item)
  }
  if (items.length === 0) return null

  const index = buildPageTextIndex(items)
  const span = findNeedleSpan(index, needles)

  let itemSpan: { itemStart: number; itemEnd: number } | null = null
  if (span) {
    if (span.mode === 'compact') {
      itemSpan = itemSpanFromCompactRange(index.compactToItem, span.start, span.end)
    } else {
      itemSpan = itemSpanFromTextRange(index.itemRanges, span.start, span.end)
    }
  }

  if (!itemSpan) {
    itemSpan = findWordSequenceSpan(index.wordTokens, queryWords)
  }

  if (!itemSpan) return null

  const rects = itemRectsForSpan(items, itemSpan.itemStart, itemSpan.itemEnd, viewport)
  if (rects.length === 0) return null

  return { pageNumber, rects }
}

export async function findClauseInPdf(
  pdf: PDFDocumentProxy,
  clauseText: string,
  preferredPage?: number,
  renderWidth = 900,
): Promise<ClauseMatchResult | null> {
  const needles = buildSearchNeedles(clauseText)
  const queryWords = significantWords(clauseText)
  if (needles.length === 0 && queryWords.length === 0) return null

  const pages: number[] = []
  if (preferredPage && preferredPage > 0 && preferredPage <= pdf.numPages) {
    pages.push(preferredPage)
  }
  for (let p = 1; p <= pdf.numPages; p++) {
    if (!pages.includes(p)) pages.push(p)
  }

  for (const pageNumber of pages) {
    const match = await findOnPage(pdf, pageNumber, needles, queryWords, renderWidth)
    if (match) return match
  }

  return null
}
