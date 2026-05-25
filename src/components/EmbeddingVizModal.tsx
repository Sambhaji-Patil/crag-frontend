import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEmbeddingViz } from '../contexts/EmbeddingVizContext'
import { useIsDark } from '../hooks/useIsDark'
import { fetchCollectionViz } from '../lib/api'
import type { VizPoint } from '../types'

function chunkColor(idx: number, total: number): string {
  const t = total > 1 ? idx / (total - 1) : 0
  const r = Math.round(6   + t * (124 - 6))
  const g = Math.round(182 + t * (58  - 182))
  const b = Math.round(212 + t * (237 - 212))
  return `rgb(${r},${g},${b})`
}

function niceTickValues(min: number, max: number, n = 6): number[] {
  const range = max - min
  if (range === 0) return [min]
  const rawStep = range / n
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const niceStep = ([1, 2, 2.5, 5, 10].find(s => s * mag >= rawStep) ?? 10) * mag
  const start = Math.ceil((min - niceStep * 0.001) / niceStep) * niceStep
  const ticks: number[] = []
  for (let t = start; t <= max + niceStep * 0.001; t += niceStep)
    ticks.push(Math.round(t * 1e7) / 1e7)
  return ticks
}

function fmt(v: number): string {
  const a = Math.abs(v)
  if (a === 0) return '0'
  if (a >= 100) return Math.round(v).toString()
  if (a >= 10) return v.toFixed(1)
  return v.toFixed(2)
}

const W = 680, H = 440
const PL = 54, PR = 18, PT = 16, PB = 38
const PW = W - PL - PR, PH = H - PT - PB

interface ScaleInfo {
  xMin: number; xMax: number; yMin: number; yMax: number
  toSvgX: (x: number) => number; toSvgY: (y: number) => number
  xTicks: number[]; yTicks: number[]
}

function computeScale(pts: VizPoint[]): ScaleInfo | null {
  if (!pts.length) return null
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys), y1 = Math.max(...ys)
  const xp = (x1 - x0) * 0.05 || 0.2, yp = (y1 - y0) * 0.05 || 0.2
  const xLo = x0 - xp, xHi = x1 + xp, yLo = y0 - yp, yHi = y1 + yp
  return {
    xMin: xLo, xMax: xHi, yMin: yLo, yMax: yHi,
    toSvgX: x => PL + ((x - xLo) / (xHi - xLo)) * PW,
    toSvgY: y => PT + PH - ((y - yLo) / (yHi - yLo)) * PH,
    xTicks: niceTickValues(xLo, xHi, 7),
    yTicks: niceTickValues(yLo, yHi, 6),
  }
}

interface ScaledPoint extends VizPoint { svgX: number; svgY: number }

export function EmbeddingVizModal() {
  const { vizState, closeViz } = useEmbeddingViz()
  const isDark = useIsDark()
  const [rawPoints, setRawPoints] = useState<VizPoint[]>([])
  const [scale, setScale] = useState<ScaleInfo | null>(null)
  const [points, setPoints] = useState<ScaledPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState<ScaledPoint | null>(null)
  const tipPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    if (!vizState) return
    setLoading(true); setRawPoints([]); setPoints([]); setScale(null)
    fetchCollectionViz(vizState.collection)
      .then(raw => {
        const sc = computeScale(raw)
        if (!sc) return
        setRawPoints(raw); setScale(sc)
        setPoints(raw.map(p => ({ ...p, svgX: sc.toSvgX(p.x), svgY: sc.toSvgY(p.y) })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [vizState?.collection])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeViz() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [closeViz])

  const total = rawPoints.length

  // Theme colours
  const c = isDark ? {
    svgBg: '#09090b',
    modal: 'bg-zinc-950 border-zinc-800',
    header: 'border-zinc-800',
    footer: 'border-zinc-800 text-zinc-600',
    grid: 'rgba(255,255,255,0.07)',
    axisLine: 'rgba(255,255,255,0.16)',
    tick: 'rgba(161,161,170,0.75)',
    axisLabel: 'rgba(113,113,122,0.55)',
    zero: 'rgba(124,58,237,0.2)',
    tipBg: 'bg-zinc-900 border-zinc-700',
  } : {
    svgBg: '#f9fafb',
    modal: 'bg-white border-zinc-300',
    header: 'border-zinc-200',
    footer: 'border-zinc-200 text-zinc-500',
    grid: 'rgba(0,0,0,0.07)',
    axisLine: 'rgba(0,0,0,0.2)',
    tick: 'rgba(63,63,70,0.8)',
    axisLabel: 'rgba(82,82,91,0.65)',
    zero: 'rgba(124,58,237,0.22)',
    tipBg: 'bg-white border-zinc-300',
  }

  return (
    <AnimatePresence>
      {vizState && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 z-40"
            onClick={closeViz}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className={`fixed inset-4 md:inset-12 z-50 flex flex-col border-2 shadow-[6px_6px_0px_0px_#7C3AED] overflow-hidden ${c.modal}`}
          >
            {/* Header */}
            <div className={`border-b-2 px-5 py-3 flex items-center gap-3 flex-shrink-0 ${c.header}`}>
              <span className="label-upper text-violet-500">Embedding Space</span>
              <span className="font-mono text-xs text-zinc-500 truncate flex-1" title={vizState.filename}>
                {vizState.filename}
              </span>
              {!loading && total > 0 && <span className="badge-violet">{total} chunks</span>}
              <button
                onClick={closeViz}
                className="w-7 h-7 border-2 border-zinc-400 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-500 flex-shrink-0 transition-colors"
                title="Close (Esc)"
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 1l7 7M8 1L1 8" strokeLinecap="square" />
                </svg>
              </button>
            </div>

            {/* Chart */}
            <div className="flex-1 relative overflow-hidden p-3">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent animate-spin" />
                    <p className="label-upper text-zinc-500">Computing PCA projection…</p>
                  </div>
                </div>
              )}
              {!loading && points.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="label-upper text-zinc-500">No data available</p>
                </div>
              )}
              {!loading && points.length > 0 && scale && (
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-full"
                  onMouseMove={e => {
                    const r = e.currentTarget.getBoundingClientRect()
                    tipPos.current = { x: e.clientX - r.left, y: e.clientY - r.top }
                  }}
                >
                  <rect width={W} height={H} fill={c.svgBg} />

                  {/* Grid lines + tick labels */}
                  {scale.xTicks.map(tick => {
                    const sx = scale.toSvgX(tick)
                    if (sx < PL - 1 || sx > PL + PW + 1) return null
                    return (
                      <g key={`xt-${tick}`}>
                        <line x1={sx} y1={PT} x2={sx} y2={PT + PH} stroke={c.grid} strokeWidth="0.8" />
                        <text x={sx} y={PT + PH + 16} textAnchor="middle"
                              fontSize="10" fontFamily="ui-monospace,monospace" fill={c.tick}>
                          {fmt(tick)}
                        </text>
                      </g>
                    )
                  })}
                  {scale.yTicks.map(tick => {
                    const sy = scale.toSvgY(tick)
                    if (sy < PT - 1 || sy > PT + PH + 1) return null
                    return (
                      <g key={`yt-${tick}`}>
                        <line x1={PL} y1={sy} x2={PL + PW} y2={sy} stroke={c.grid} strokeWidth="0.8" />
                        <text x={PL - 7} y={sy + 3.5} textAnchor="end"
                              fontSize="10" fontFamily="ui-monospace,monospace" fill={c.tick}>
                          {fmt(tick)}
                        </text>
                      </g>
                    )
                  })}

                  {/* Zero-crossing highlights */}
                  {scale.xMin <= 0 && scale.xMax >= 0 && (
                    <line x1={scale.toSvgX(0)} y1={PT} x2={scale.toSvgX(0)} y2={PT + PH}
                          stroke={c.zero} strokeWidth="1" />
                  )}
                  {scale.yMin <= 0 && scale.yMax >= 0 && (
                    <line x1={PL} y1={scale.toSvgY(0)} x2={PL + PW} y2={scale.toSvgY(0)}
                          stroke={c.zero} strokeWidth="1" />
                  )}

                  {/* Axis borders */}
                  <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke={c.axisLine} strokeWidth="1" />
                  <line x1={PL} y1={PT + PH} x2={PL + PW} y2={PT + PH} stroke={c.axisLine} strokeWidth="1" />

                  {/* Axis labels */}
                  <text x={PL + PW / 2} y={H - 3} textAnchor="middle"
                        fontSize="9" fontFamily="ui-monospace,monospace" fill={c.axisLabel}>PC 1</text>
                  <text x={11} y={PT + PH / 2} textAnchor="middle"
                        fontSize="9" fontFamily="ui-monospace,monospace" fill={c.axisLabel}
                        transform={`rotate(-90, 11, ${PT + PH / 2})`}>PC 2</text>

                  {/* Points */}
                  {points.map((p, i) => (
                    <motion.circle
                      key={p.doc_id}
                      cx={p.svgX} cy={p.svgY}
                      fill={chunkColor(p.chunk_index, total)}
                      fillOpacity={hovered ? (hovered.doc_id === p.doc_id ? 1 : 0.28) : 0.85}
                      stroke={hovered?.doc_id === p.doc_id ? (isDark ? '#fff' : '#18181b') : 'none'}
                      strokeWidth="1.5"
                      initial={{ opacity: 0, r: 0 }}
                      animate={{ opacity: 1, r: hovered?.doc_id === p.doc_id ? 7 : 5 }}
                      transition={{ delay: i * 0.005, duration: 0.22 }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(p)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  ))}
                </svg>
              )}

              {/* Tooltip */}
              <AnimatePresence>
                {hovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className={`absolute pointer-events-none z-10 max-w-[270px] border-2 shadow-[4px_4px_0px_0px_#7C3AED] p-2.5 ${c.tipBg}`}
                    style={{
                      left: Math.min(tipPos.current.x + 14, 640 - 285),
                      top: Math.max(tipPos.current.y - 72, 8),
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                           style={{ background: chunkColor(hovered.chunk_index, total) }} />
                      <span className="label-upper text-zinc-400">chunk #{hovered.chunk_index}</span>
                      {hovered.page !== null && (
                        <span className="label-upper text-zinc-500">p.{Number(hovered.page) + 1}</span>
                      )}
                      <span className="label-upper text-zinc-500 ml-auto font-mono text-[9px]">
                        {hovered.x.toFixed(3)}, {hovered.y.toFixed(3)}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      {hovered.preview.slice(0, 110)}{hovered.preview.length > 110 ? '…' : ''}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className={`border-t-2 px-5 py-2.5 flex items-center gap-4 flex-shrink-0 ${c.footer}`}>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 rounded-sm"
                     style={{ background: 'linear-gradient(to right, rgb(6,182,212), rgb(124,58,237))' }} />
                <span className="label-upper">chunk sequence (first → last)</span>
              </div>
              <span className="label-upper ml-auto opacity-60">PCA 2D · hover for preview + coords</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
