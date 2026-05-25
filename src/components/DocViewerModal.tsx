import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDocViewer } from '../contexts/DocViewerContext'
import { API_BASE } from '../lib/api'

export function DocViewerModal() {
  const { viewer, close } = useDocViewer()
  const [page, setPage] = useState(1)
  const [inputPage, setInputPage] = useState('1')

  useEffect(() => {
    if (viewer) {
      setPage(viewer.page)
      setInputPage(String(viewer.page))
    }
  }, [viewer?.collection, viewer?.page])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  const isPdf = viewer?.filename.toLowerCase().endsWith('.pdf') ?? false
  const iframeSrc = viewer
    ? isPdf
      ? `${API_BASE}/documents/${encodeURIComponent(viewer.collection)}/raw#page=${page}`
      : `${API_BASE}/documents/${encodeURIComponent(viewer.collection)}/raw`
    : ''

  function navigate(newPage: number) {
    const n = Math.max(1, newPage)
    setPage(n)
    setInputPage(String(n))
  }

  function commitInput() {
    const n = parseInt(inputPage, 10)
    if (!isNaN(n) && n >= 1) navigate(n)
    else setInputPage(String(page))
  }

  return (
    <AnimatePresence>
      {viewer && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 z-40"
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-4 md:inset-10 z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-[6px_6px_0px_0px_#7C3AED] overflow-hidden"
          >
            {/* Header */}
            <div className="border-b-2 border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 flex-shrink-0 bg-white dark:bg-zinc-900">
              <span className="font-mono text-[10px] text-violet-500 flex-shrink-0 label-upper">Preview</span>
              <p
                className="font-mono text-xs text-zinc-600 dark:text-zinc-400 truncate flex-1"
                title={viewer.filename}
              >
                {viewer.filename}
              </p>

              {isPdf && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => navigate(page - 1)}
                    disabled={page <= 1}
                    className="w-7 h-7 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 1L3 4l3 3" strokeLinecap="square" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={inputPage}
                    onChange={(e) => setInputPage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitInput() }}
                    onBlur={commitInput}
                    className="w-12 h-7 border-2 border-zinc-300 dark:border-zinc-700 bg-transparent text-center font-mono text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() => navigate(page + 1)}
                    className="w-7 h-7 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-zinc-500 transition-colors"
                    title="Next page"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 1l3 3-3 3" strokeLinecap="square" />
                    </svg>
                  </button>
                  <span className="label-upper text-zinc-400 dark:text-zinc-600 ml-1">p.{page}</span>
                </div>
              )}

              <button
                onClick={close}
                className="w-7 h-7 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-500 flex-shrink-0 transition-colors"
                title="Close (Esc)"
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 1l7 7M8 1L1 8" strokeLinecap="square" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              className="flex-1 w-full border-0 bg-white"
              title={viewer.filename}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
