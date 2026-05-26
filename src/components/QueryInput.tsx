import { useState, useRef, useEffect } from 'react'

const MODES = [
  { id: 'hybrid', label: 'HYBRID', title: 'BM25 + Vector RRF fusion' },
  { id: 'vector', label: 'VECTOR', title: 'Dense cosine similarity only' },
  { id: 'bm25',   label: 'BM25',   title: 'Sparse keyword matching only' },
  { id: 'mmr',    label: 'MMR',    title: 'Maximal Marginal Relevance (diverse results)' },
]

const EMBEDDINGS = [
  {
    id: 'bge-large',
    label: 'BGE-LARGE (1024)',
    hint: 'Best quality. Fast on GPU, slow on CPU.',
  },
  {
    id: 'openai-small',
    label: 'OPENAI-SMALL (1536)',
    hint: 'Fast on CPU via API. Uses OpenAI embeddings.',
  },
  {
    id: 'bge-small',
    label: 'BGE-SMALL (384)',
    hint: 'Fastest local CPU option. Lower recall than BGE-LARGE.',
  },
]

interface Props {
  onSubmit: (query: string) => void
  disabled: boolean
  hasDocuments: boolean
  retrievalMode: string
  onRetrievalModeChange: (mode: string) => void
  embeddingMode: string
  onEmbeddingModeChange: (mode: string) => void
  embeddingRecommendedMode?: string
  embeddingDevice?: string
  onQueryChange?: (query: string) => void
}

export function QueryInput({
  onSubmit,
  disabled,
  hasDocuments,
  retrievalMode,
  onRetrievalModeChange,
  embeddingMode,
  onEmbeddingModeChange,
  embeddingRecommendedMode,
  embeddingDevice,
  onQueryChange,
}: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit() {
    const q = value.trim()
    if (!q || disabled) return
    onSubmit(q)
    setValue('')
    onQueryChange?.('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  const placeholder = !hasDocuments
    ? 'Upload documents first…'
    : disabled
    ? 'Processing pipeline…'
    : 'Ask a question about your documents  (Enter to send)'

  const deviceLabel = embeddingDevice === 'cuda'
    ? 'GPU'
    : embeddingDevice === 'cpu'
    ? 'CPU'
    : 'this system'

  return (
    <div className="border-t-2 border-zinc-200 dark:border-zinc-800 p-4 flex-shrink-0 bg-zinc-50 dark:bg-zinc-950">
      {/* Retrieval mode selector */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="label-upper mr-1">Retrieval</span>
        {MODES.map((m) => {
          const isActive = retrievalMode === m.id
          return (
            <button
              key={m.id}
              onClick={() => onRetrievalModeChange(m.id)}
              disabled={disabled}
              title={m.title}
              className={`
                px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase border
                transition-all duration-150
                ${isActive
                  ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-brutal-sm'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-500 bg-transparent hover:border-zinc-400 dark:hover:border-zinc-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Embedding selector */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="label-upper mr-1">Embeddings</span>
        {EMBEDDINGS.map((e) => {
          const isActive = embeddingMode === e.id
          const isRecommended = embeddingRecommendedMode === e.id
          const title = `${e.hint} ${isRecommended ? `Recommended on ${deviceLabel}.` : 'Optional.'}`
          return (
            <button
              key={e.id}
              onClick={() => onEmbeddingModeChange(e.id)}
              disabled={disabled}
              title={title}
              className={`
                px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase border
                transition-all duration-150
                ${isActive
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-brutal-sm'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-500 bg-transparent hover:border-zinc-400 dark:hover:border-zinc-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {e.label}
            </button>
          )
        })}
      </div>

      {/* Input row */}
      <div className={`
        flex gap-0 border-2 transition-all duration-150
        ${disabled
          ? 'border-zinc-300 dark:border-zinc-800 opacity-60'
          : value
          ? 'border-violet-600 shadow-brutal'
          : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
        }
      `}>
        {/* Input */}
        <div className="flex-1 relative bg-white dark:bg-transparent">
          <span className="absolute left-3 top-3 font-mono text-violet-500 text-sm select-none">›</span>
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => { setValue(e.target.value); onQueryChange?.(e.target.value) }}
            onKeyDown={onKeyDown}
            disabled={disabled || !hasDocuments}
            placeholder={placeholder}
            className="
              w-full bg-transparent resize-none
              pl-8 pr-3 py-3
              text-sm text-zinc-900 dark:text-zinc-100
              placeholder-zinc-400 dark:placeholder-zinc-600
              focus:outline-none font-sans
            "
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim() || !hasDocuments}
          className={`
            flex-shrink-0 w-12 border-l-2 transition-all duration-150
            font-bold text-xs flex items-center justify-center
            ${
              !disabled && value.trim() && hasDocuments
                ? 'border-violet-600 bg-violet-600 text-white hover:bg-violet-500 active:translate-x-[2px] active:translate-y-[2px]'
                : 'border-zinc-300 dark:border-zinc-800 bg-transparent text-zinc-400 dark:text-zinc-700'
            }
          `}
          title="Send (Enter)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 13L13 7 1 1v4.5l8 1.5-8 1.5V13z" strokeLinejoin="miter" />
          </svg>
        </button>
      </div>

      <p className="mt-1.5 label-upper text-zinc-400 dark:text-zinc-700">
        {disabled ? '⟳ pipeline running' : 'shift+enter for newline'}
      </p>
    </div>
  )
}
