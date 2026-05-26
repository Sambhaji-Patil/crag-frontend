import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDocViewer } from '../contexts/DocViewerContext'
import type { Source } from '../types'

interface Props {
  sources: Source[]
}

export function SourceCards({ sources }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const { open: openViewer, getCollectionByFilename } = useDocViewer()

  if (sources.length === 0) return null

  return (
    <div className="mt-3 space-y-1.5">
      <p className="label-upper text-zinc-500">Sources ({sources.length})</p>
      <div className="space-y-1">
        {sources.map((src) => {
          const isOpen = open === src.doc_id
          const pct = Math.min(100, Math.max(0, Math.round(src.relevance_score * 100)))
          const scoreColor =
            src.relevance_score > 0.8
              ? 'text-emerald-500 dark:text-emerald-400'
              : src.relevance_score > 0.6
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-zinc-500 dark:text-zinc-400'

          // Filename: strip path prefixes
          const filename = src.metadata?.source_id
            ? String(src.metadata.source_id).split(/[/\\]/).pop() ?? src.doc_id.slice(0, 12)
            : src.doc_id.slice(0, 12)

          // Page number (PDF pages are 0-indexed in metadata)
          const rawPage = src.metadata?.page
          const pageLabel =
            rawPage !== undefined && rawPage !== null
              ? `p.${Number(rawPage) + 1}`
              : src.metadata?.chunk_index !== undefined
              ? `chunk #${src.metadata.chunk_index}`
              : null

          // Resolve the FAISS collection for this source (if ingested in this session)
          const collection = getCollectionByFilename(filename)
          const previewPage = rawPage !== undefined && rawPage !== null ? Number(rawPage) + 1 : 1

          return (
            <div
              key={src.doc_id}
              className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              {/* Header row */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-left"
                onClick={() => setOpen(isOpen ? null : src.doc_id)}
              >
                {/* Score bar */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`font-mono text-[11px] font-bold ${scoreColor}`}>
                    {src.relevance_score.toFixed(2)}
                  </span>
                  <div className="w-16 h-1 bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className={`h-full score-bar ${
                        src.relevance_score > 0.8
                          ? 'bg-emerald-500'
                          : src.relevance_score > 0.6
                          ? 'bg-amber-500'
                          : 'bg-zinc-400 dark:bg-zinc-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Filename */}
                <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500 truncate flex-1" title={filename}>
                  {filename}
                </span>

                {/* Page / chunk info */}
                {pageLabel && (
                  <span className="label-upper text-zinc-400 dark:text-zinc-600 flex-shrink-0">
                    {pageLabel}
                  </span>
                )}

                {/* View page button — only shown when the doc was ingested this session */}
                {collection && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openViewer(collection, filename, previewPage)
                    }}
                    className="w-5 h-5 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-violet-600 hover:border-violet-500 flex-shrink-0 transition-colors"
                    title={`Preview ${filename} ${rawPage !== undefined ? `— page ${previewPage}` : ''}`}
                  >
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <ellipse cx="4.5" cy="4.5" rx="3.5" ry="2.2" />
                      <circle cx="4.5" cy="4.5" r="1.1" fill="currentColor" stroke="none" />
                    </svg>
                  </button>
                )}

                <svg
                  className={`w-3 h-3 text-zinc-400 dark:text-zinc-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 4l4 4 4-4" strokeLinecap="square" />
                </svg>
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 border-t border-zinc-200 dark:border-zinc-800">
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-2 whitespace-pre-wrap">
                        {src.content}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
