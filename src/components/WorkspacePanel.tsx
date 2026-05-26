import { useState, useRef, useCallback, useEffect, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadFile, watchIngestJob, fetchTryDocs } from '../lib/api'
import { useDocViewer } from '../contexts/DocViewerContext'
import { useEmbeddingViz } from '../contexts/EmbeddingVizContext'
import type { IngestedDoc, TryDoc } from '../types'

interface Props {
  sessionId: string
  docs: IngestedDoc[]
  onDocsChange: Dispatch<SetStateAction<IngestedDoc[]>>
  embeddingMode: string
  style?: CSSProperties
}

export function WorkspacePanel({ sessionId, docs, onDocsChange, embeddingMode, style }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { open: openViewer } = useDocViewer()
  const { openViz } = useEmbeddingViz()
  const [tryDocs, setTryDocs] = useState<TryDoc[]>([])
  const [tryDocsLoading, setTryDocsLoading] = useState(false)
  const [tryDocsError, setTryDocsError] = useState<string | null>(null)

  // Auto-open embedding viz when a doc finishes ingesting
  const prevDoneRef = useRef(new Set<string>())
  useEffect(() => {
    for (const doc of docs) {
      if (doc.status === 'done' && doc.collection && !prevDoneRef.current.has(doc.jobId)) {
        prevDoneRef.current.add(doc.jobId)
        openViz(doc.collection, doc.filename)
        break
      }
    }
  }, [docs, openViz])

  const refreshTryDocs = useCallback(() => {
    setTryDocsLoading(true)
    setTryDocsError(null)
    fetchTryDocs()
      .then((items) => setTryDocs(items))
      .catch((err) => {
        setTryDocsError(err instanceof Error ? err.message : 'Failed to load Try Docs')
      })
      .finally(() => setTryDocsLoading(false))
  }, [])

  useEffect(() => {
    refreshTryDocs()
  }, [refreshTryDocs])

  const upsertDoc = useCallback(
    (doc: IngestedDoc) =>
      onDocsChange((prev) => [
        ...prev.filter((d) => d.jobId !== doc.jobId),
        doc,
      ]),
    [onDocsChange]
  )

  const handleFiles = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        const allowed = ['.pdf', '.txt', '.md']
        const ext = '.' + file.name.split('.').pop()!.toLowerCase()
        if (!allowed.includes(ext)) continue

        const placeholderId = `pending-${Date.now()}`
        onDocsChange((prev) => [
          ...prev,
          { filename: file.name, jobId: placeholderId, chunks: 0, status: 'processing', progress: 0 },
        ])

        try {
          const { job_id } = await uploadFile(file, sessionId, embeddingMode)

          onDocsChange((prev) => [
            ...prev.filter((d) => d.jobId !== placeholderId),
            { filename: file.name, jobId: job_id, chunks: 0, status: 'processing', progress: 5 },
          ])

          watchIngestJob(job_id, (job) => {
            upsertDoc({
              filename: file.name,
              jobId: job_id,
              chunks: job.chunks_created,
              status: job.status,
              progress: job.progress,
              message: job.message,
              collection: job.status === 'done' ? job.collection_name : undefined,
            })
          })
        } catch (err) {
          onDocsChange((prev) => [
            ...prev.filter((d) => d.jobId !== placeholderId),
            {
              filename: file.name,
              jobId: `err-${Date.now()}`,
              chunks: 0,
              status: 'failed',
              progress: 0,
              message: err instanceof Error ? err.message : 'Upload failed',
            },
          ])
        }
      }
    },
    [sessionId, onDocsChange, upsertDoc, embeddingMode]
  )

  const addTryDoc = useCallback(
    (doc: TryDoc) => {
      if (!doc.ready) return
      onDocsChange((prev) => {
        const exists = prev.some((d) => d.collection === doc.collection)
        if (exists) return prev
        return [
          ...prev,
          {
            filename: doc.filename,
            jobId: `try-${doc.collection}`,
            chunks: doc.chunks,
            status: 'done',
            progress: 100,
            message: 'ready',
            collection: doc.collection,
          },
        ]
      })
    },
    [onDocsChange]
  )

  const removeDoc = useCallback(
    (jobId: string) => {
      onDocsChange((prev) => prev.filter((d) => d.jobId !== jobId))
    },
    [onDocsChange]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const short = sessionId.slice(0, 8).toUpperCase()
  const hasDocs = docs.length > 0

  return (
    <aside
      className="flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950"
      style={style}
    >
      {/* Session info */}
      <div className="border-b-2 border-zinc-200 dark:border-zinc-800 px-4 py-3 flex-shrink-0">
        <p className="label-upper mb-1.5">Workspace</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{short}…</span>
          <span className="text-zinc-400 dark:text-zinc-700 text-[10px]">ephemeral · no auth</span>
        </div>
      </div>

      {/* Upload zone */}
      <div className="p-4 border-b-2 border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <p className="label-upper mb-3">Documents</p>

        <div
          className={`
            relative border-2 border-dashed transition-all duration-200 cursor-pointer
            ${isDragging
              ? 'border-violet-500 bg-violet-500/10 shadow-brutal'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
            }
          `}
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="py-6 px-4 flex flex-col items-center gap-2">
            <div className={`
              w-9 h-9 border-2 flex items-center justify-center transition-colors
              ${isDragging
                ? 'border-violet-500 text-violet-500'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'
              }
            `}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 11V3M5 6l3-3 3 3M3 13h10" strokeLinecap="square" />
              </svg>
            </div>
            <p className="text-[11px] font-bold tracking-wide text-zinc-500 dark:text-zinc-400 uppercase">
              {isDragging ? 'Drop to upload' : 'Drop files or click'}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">PDF · TXT · MD</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* Try Docs */}
        <div
          className="flex flex-col min-h-0 border-b-2 border-zinc-200 dark:border-zinc-800"
          style={{ flex: hasDocs ? '0 0 50%' : '1 1 auto' }}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="label-upper">Try Docs</p>
            <button
              onClick={refreshTryDocs}
              className="text-[10px] font-mono text-zinc-400 hover:text-violet-500"
              title="Refresh"
            >
              refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
            {tryDocsLoading && (
              <p className="text-[10px] text-zinc-400">Loading…</p>
            )}
            {!tryDocsLoading && tryDocsError && (
              <p className="text-[10px] text-red-500">{tryDocsError}</p>
            )}
            {!tryDocsLoading && !tryDocsError && tryDocs.length === 0 && (
              <p className="text-[10px] text-zinc-400">No Try Docs found</p>
            )}

            {tryDocs.map((doc) => {
              const added = docs.some((d) => d.collection === doc.collection)
              return (
                <div
                  key={doc.collection}
                  className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-2 flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400 truncate" title={doc.filename}>
                      {doc.filename}
                    </p>
                    <p className="label-upper text-zinc-400 dark:text-zinc-600">
                      {doc.ready ? `${doc.chunks} chunks` : 'index missing'}
                    </p>
                  </div>
                  <button
                    disabled={!doc.ready || added}
                    onClick={() => addTryDoc(doc)}
                    className={`text-[10px] font-mono border px-2 py-1 transition-colors ${
                      added
                        ? 'border-emerald-400 text-emerald-600 cursor-default'
                        : doc.ready
                        ? 'border-zinc-300 text-zinc-500 hover:border-violet-500 hover:text-violet-600'
                        : 'border-zinc-200 text-zinc-300 cursor-not-allowed'
                    }`}
                  >
                    {added ? 'added' : 'add'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Document list */}
        {hasDocs && (
          <div className="flex flex-col min-h-0" style={{ flex: '0 0 50%' }}>
            <div className="px-4 py-2 border-b-2 border-zinc-200 dark:border-zinc-800">
              <p className="label-upper text-zinc-500">Added Docs ({docs.length})</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              <AnimatePresence>
                {docs.map((doc) => (
                  <motion.div
                    key={doc.jobId}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`
                      border-2 p-3 transition-colors
                      ${doc.status === 'done'
                        ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-brutal-muted'
                        : doc.status === 'failed'
                        ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 truncate" title={doc.filename}>
                        {doc.filename}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {doc.status === 'done' && doc.collection && (
                          <>
                            {/* Embedding viz button */}
                            <button
                              onClick={() => openViz(doc.collection!, doc.filename)}
                              className="w-5 h-5 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-violet-600 hover:border-violet-500 transition-colors"
                              title="View embedding space"
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="2.5" cy="7" r="1.2" />
                                <circle cx="5" cy="3" r="1.2" />
                                <circle cx="7.5" cy="6" r="1.2" />
                                <circle cx="4" cy="6.5" r="1.2" />
                              </svg>
                            </button>
                            {/* Doc preview button */}
                            <button
                              onClick={() => openViewer(doc.collection!, doc.filename, 1)}
                              className="w-5 h-5 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-violet-600 hover:border-violet-500 transition-colors"
                              title="Preview document"
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <ellipse cx="5" cy="5" rx="4" ry="2.5" />
                                <circle cx="5" cy="5" r="1.2" fill="currentColor" stroke="none" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => removeDoc(doc.jobId)}
                          disabled={doc.status === 'processing'}
                          className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                            doc.status === 'processing'
                              ? 'border-zinc-200 dark:border-zinc-800 text-zinc-300 cursor-not-allowed'
                              : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:border-red-400'
                          }`}
                          title="Remove from session"
                        >
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M1 1l7 7M8 1L1 8" strokeLinecap="square" />
                          </svg>
                        </button>
                        {doc.status === 'done'       && <span className="badge-green">✓</span>}
                        {doc.status === 'failed'     && <span className="badge-red">✕</span>}
                        {doc.status === 'processing' && <span className="badge-violet animate-pulse">⟳</span>}
                      </div>
                    </div>

                    {doc.status === 'done' && doc.chunks > 0 && (
                      <p className="label-upper text-emerald-600">{doc.chunks} chunks indexed</p>
                    )}

                    {doc.status === 'processing' && (
                      <div className="mt-2">
                        <div className="h-1 bg-zinc-200 dark:bg-zinc-800 w-full">
                          <div
                            className="h-full bg-violet-500 score-bar"
                            style={{ width: `${doc.progress}%` }}
                          />
                        </div>
                        <p className="label-upper mt-1 text-violet-600">
                          {doc.message ?? `${doc.progress}%`}
                        </p>
                      </div>
                    )}

                    {doc.status === 'failed' && (
                      <div className="mt-1 space-y-1">
                        <p className="label-upper text-red-500">indexing failed</p>
                        {doc.message && (
                          <p className="font-mono text-[10px] text-red-400/70 leading-snug break-words">
                            {doc.message}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Footer: stack info */}
      <div className="border-t-2 border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-1 flex-shrink-0">
        <p className="label-upper text-zinc-400 dark:text-zinc-700">Stack</p>
        <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">BGE-large · FAISS · RRF hybrid</p>
        <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">cross-encoder rerank · Llama Guard</p>
      </div>
    </aside>
  )
}
