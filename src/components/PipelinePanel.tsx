import { type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PipelineStep, ChunkPreview } from '../types'

const STEP_META: Record<string, { label: string; icon: string }> = {
  pipeline_start:    { label: 'INIT',             icon: '◈' },
  guardrail_check:   { label: 'SAFETY CHECK',     icon: '⬡' },
  cache_check:       { label: 'CACHE',            icon: '⬡' },
  doc_routing:       { label: 'DOC ROUTING',       icon: '⬡' },
  query_rewrite:     { label: 'QUERY REWRITE',    icon: '⬡' },
  retrieval_start:   { label: 'RETRIEVAL',        icon: '⬡' },
  chunks_retrieved:  { label: 'CHUNKS FOUND',     icon: '⬡' },
  context_built:     { label: 'CONTEXT',          icon: '⬡' },
  generation_start:  { label: 'GENERATING',       icon: '⬡' },
  complete:          { label: 'COMPLETE',         icon: '◈' },
}

function statusColor(status: string) {
  switch (status) {
    case 'done':
    case 'passed':
    case 'hit':
      return 'text-emerald-500 dark:text-emerald-400'
    case 'blocked':
    case 'failed':
      return 'text-red-500 dark:text-red-400'
    case 'in_progress':
      return 'text-violet-500 dark:text-violet-400 animate-pulse'
    case 'skipped':
      return 'text-zinc-400 dark:text-zinc-500'
    case 'miss':
      return 'text-amber-500 dark:text-amber-400'
    default:
      return 'text-zinc-500 dark:text-zinc-400'
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'done':
    case 'passed':
      return <span className="badge-green">✓</span>
    case 'hit':
      return <span className="badge-green">HIT</span>
    case 'miss':
      return <span className="badge-amber">MISS</span>
    case 'blocked':
      return <span className="badge-red">BLOCKED</span>
    case 'skipped':
      return <span className="badge-zinc">SKIP</span>
    case 'in_progress':
      return (
        <span className="badge-violet animate-pulse">
          <span className="inline-block w-2 h-2 mr-1 rounded-full bg-violet-400 animate-ping" />
          LIVE
        </span>
      )
    case 'empty':
      return <span className="badge-amber">EMPTY</span>
    default:
      return null
  }
}

function StepDetail({ step }: { step: PipelineStep }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = step.data as Record<string, any>

  if (step.event === 'query_rewrite' && step.status !== 'skipped') {
    return (
      <div className="mt-2 space-y-1">
        {d.original && (
          <div className="flex gap-2">
            <span className="font-mono text-[10px] text-zinc-500 flex-shrink-0">IN</span>
            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500 italic">
              "{String(d.original).slice(0, 60)}{String(d.original).length > 60 ? '…' : ''}"
            </span>
          </div>
        )}
        {d.rewritten && (
          <div className="flex gap-2">
            <span className="font-mono text-[10px] text-violet-500 dark:text-violet-600 flex-shrink-0">→</span>
            <span className="font-mono text-[10px] text-violet-600 dark:text-violet-300">
              "{String(d.rewritten).slice(0, 60)}{String(d.rewritten).length > 60 ? '…' : ''}"
            </span>
          </div>
        )}
      </div>
    )
  }

  if (step.event === 'chunks_retrieved' && step.status === 'done') {
    const chunks = (d.chunks as ChunkPreview[]) ?? []
    return (
      <div className="mt-2 space-y-1.5">
        {chunks.slice(0, 5).map((c, i) => (
          <motion.div
            key={c.doc_id + i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2 }}
            className="border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/60 px-2 py-1.5"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-mono text-[11px] font-bold flex-shrink-0 ${
                c.score > 0.8
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : c.score > 0.6
                  ? 'text-amber-500 dark:text-amber-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}>
                {c.score.toFixed(3)}
              </span>
              <div className="flex-1 h-[3px] bg-zinc-200 dark:bg-zinc-800">
                <motion.div
                  className={`h-full ${c.score > 0.8 ? 'bg-emerald-500' : c.score > 0.6 ? 'bg-amber-500' : 'bg-zinc-400 dark:bg-zinc-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(c.score * 100)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06 + 0.1 }}
                />
              </div>
            </div>
            <p className="font-mono text-[10px] text-zinc-500 leading-snug">
              {c.preview.slice(0, 80)}{c.preview.length > 80 ? '…' : ''}
            </p>
            <p className="label-upper text-zinc-400 dark:text-zinc-700 mt-0.5">
              {String(c.source).split(/[/\\]/).pop()} · chunk #{c.chunk_index}
            </p>
          </motion.div>
        ))}
        {chunks.length > 5 && (
          <p className="label-upper text-zinc-400 dark:text-zinc-600">+{chunks.length - 5} more chunks</p>
        )}
      </div>
    )
  }

  if (step.event === 'context_built' && step.status === 'done') {
    return (
      <div className="mt-1.5 flex gap-4">
        {d.chunks_used !== undefined && (
          <div>
            <p className="label-upper text-zinc-400 dark:text-zinc-600">Chunks</p>
            <p className="font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold">
              {String(d.chunks_used)}
            </p>
          </div>
        )}
        {d.estimated_tokens !== undefined && (
          <div>
            <p className="label-upper text-zinc-400 dark:text-zinc-600">~Tokens</p>
            <p className="font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold">
              {Number(d.estimated_tokens).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (step.event === 'retrieval_start') {
    return (
      <div className="mt-1.5 flex gap-3 items-center">
        <span className="badge-violet">{String(d.mode ?? 'hybrid').toUpperCase()}</span>
        <span className="label-upper text-zinc-400 dark:text-zinc-600">top-{String(d.top_k ?? '—')}</span>
      </div>
    )
  }

  if (step.event === 'doc_routing') {
    return (
      <div className="mt-1.5 space-y-1">
        <div className="flex flex-wrap gap-1">
          {(d.selected as string[]).map((name: string) => (
            <span key={name} className="badge-violet text-[9px]">{name.toUpperCase()}</span>
          ))}
        </div>
        {d.mode === 'comparison' && (
          <p className="font-mono text-[10px] text-violet-500 dark:text-violet-400">comparison mode — all docs</p>
        )}
        {d.mode === 'targeted' && (
          <p className="font-mono text-[10px] text-amber-500 dark:text-amber-400">targeted — 1 of {String(d.total_docs)} docs</p>
        )}
      </div>
    )
  }

  if (step.event === 'cache_check' && d.type) {
    return (
      <p className="font-mono text-[10px] text-zinc-500 mt-1">
        {String(d.type)} cache
      </p>
    )
  }

  if (step.event === 'complete' && d.latency_ms !== undefined) {
    const ms = Number(d.latency_ms)
    return (
      <p className="font-mono text-[11px] text-emerald-500 dark:text-emerald-400 font-bold mt-1">
        {(ms / 1000).toFixed(2)}s total
      </p>
    )
  }

  return null
}

interface StepRowProps {
  step: PipelineStep
  index: number
  prevArrivedAt?: number
}

function StepRow({ step, index, prevArrivedAt }: StepRowProps) {
  const meta = STEP_META[step.event] ?? { label: step.event.toUpperCase(), icon: '⬡' }
  const durationMs = prevArrivedAt ? Math.round(step.arrivedAt - prevArrivedAt) : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03 }}
      className="pl-3 border-l-2 border-zinc-200 dark:border-zinc-800 hover:border-violet-400 dark:hover:border-violet-800 transition-colors py-0.5"
    >
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs ${statusColor(step.status)}`}>
          {meta.icon}
        </span>
        <span className="label-upper text-zinc-500 dark:text-zinc-400 flex-1">{meta.label}</span>
        {statusBadge(step.status)}
        {durationMs !== null && durationMs > 0 && (
          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 ml-auto">
            {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      <StepDetail step={step} />
    </motion.div>
  )
}

interface Props {
  steps: PipelineStep[]
  isProcessing: boolean
  style?: CSSProperties
}

export function PipelinePanel({ steps, isProcessing, style }: Props) {
  const visibleSteps = steps.filter((s) => s.event !== 'token' && s.event !== 'pipeline_start')

  return (
    <aside
      className="flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950"
      style={style}
    >
      {/* Header */}
      <div className="border-b-2 border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <p className="label-upper flex-1">Pipeline Trace</p>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
            <span className="label-upper text-violet-500">live</span>
          </motion.div>
        )}
        {!isProcessing && steps.length > 0 && (
          <span className="badge-green">done</span>
        )}
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <AnimatePresence initial={false}>
          {visibleSteps.length === 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center gap-4 pt-12"
            >
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 border border-zinc-200 dark:border-zinc-800"
                    style={{ opacity: 1 - i * 0.09 }}
                  />
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Awaiting query
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-700 max-w-[200px]">
                  Each pipeline step will appear here as it executes
                </p>
              </div>

              <div className="mt-4 space-y-2 w-full border-t border-zinc-200 dark:border-zinc-800 pt-4">
                {[
                  ['SAFETY CHECK', 'Llama Guard 3.1B + regex'],
                  ['CACHE',        '2-layer exact + semantic'],
                  ['QUERY REWRITE','HyDE-lite retrieval prep'],
                  ['RETRIEVAL',    'BM25 + vector RRF fusion'],
                  ['CONTEXT',      'Parent-child stitching'],
                  ['GENERATING',   'GPT-4o-mini streaming'],
                ].map(([step, desc]) => (
                  <div key={step} className="flex gap-3">
                    <span className="label-upper text-zinc-400 dark:text-zinc-600 w-24 flex-shrink-0">{step}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-700">{desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {visibleSteps.map((step, i) => (
            <StepRow
              key={`${step.event}-${i}`}
              step={step}
              index={i}
              prevArrivedAt={i > 0 ? visibleSteps[i - 1].arrivedAt : undefined}
            />
          ))}

          {isProcessing && visibleSteps.length > 0 && visibleSteps[visibleSteps.length - 1]?.event !== 'complete' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pl-3 border-l-2 border-violet-400 dark:border-violet-800"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-violet-500 dark:text-violet-400 animate-pulse">◈</span>
                <span className="label-upper text-violet-500 dark:text-violet-600 animate-pulse">processing</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-zinc-200 dark:border-zinc-800 px-4 py-3 flex-shrink-0">
        <div className="flex gap-4">
          <div>
            <p className="label-upper text-zinc-400 dark:text-zinc-700">Embed</p>
            <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500">BGE-large-1024d</p>
          </div>
          <div>
            <p className="label-upper text-zinc-400 dark:text-zinc-700">LLM</p>
            <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500">gpt-4o-mini</p>
          </div>
          <div>
            <p className="label-upper text-zinc-400 dark:text-zinc-700">Safety</p>
            <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500">Llama-Guard-3</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
