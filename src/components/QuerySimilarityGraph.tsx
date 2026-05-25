import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchCollectionViz, fetchQuerySimilarity } from '../lib/api'
import { useIsDark } from '../hooks/useIsDark'
import type { VizPoint } from '../types'

const W = 460, H = 220
const PL = 42, PR = 14, PT = 22, PB = 30
const PW = W - PL - PR, PH = H - PT - PB
const MIN_H = 150, MAX_H = 500
const TOP_K = 10
const Q_R = 7
const C_R_TOP = 6

function edgeLine(qx: number, qy: number, px: number, py: number, qr: number, pr: number) {
  const dx = px - qx, dy = py - qy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist <= qr + pr + 1) return null
  const ux = dx / dist, uy = dy / dist
  return { x1: qx + ux * qr, y1: qy + uy * qr, x2: px - ux * pr, y2: py - uy * pr }
}

function niceTicks(min: number, max: number, n = 4): number[] {
  const range = max - min || 1
  const step = range / n
  const mag = Math.pow(10, Math.floor(Math.log10(step)))
  const s = ([1, 2, 2.5, 5, 10].find(x => x * mag >= step) ?? 10) * mag
  const start = Math.ceil((min - s * 0.001) / s) * s
  const ticks: number[] = []
  for (let t = start; t <= max + s * 0.001; t += s) ticks.push(Math.round(t * 1e7) / 1e7)
  return ticks
}

function fmt(v: number): string {
  const a = Math.abs(v)
  if (a === 0) return '0'
  return a >= 10 ? v.toFixed(1) : v.toFixed(2)
}

interface ScaleParams {
  xMin: number; xMax: number; yMin: number; yMax: number
  xTicks: number[]; yTicks: number[]
}

function buildScale(pts: VizPoint[]): ScaleParams {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys), y1 = Math.max(...ys)
  const m = 0.10
  const xp = (x1 - x0) * m || 0.5, yp = (y1 - y0) * m || 0.5
  const xMin = x0 - xp, xMax = x1 + xp, yMin = y0 - yp, yMax = y1 + yp
  return { xMin, xMax, yMin, yMax, xTicks: niceTicks(xMin, xMax, 5), yTicks: niceTicks(yMin, yMax, 4) }
}

function toSvgX(x: number, sc: ScaleParams) { return PL + ((x - sc.xMin) / (sc.xMax - sc.xMin)) * PW }
function toSvgY(y: number, sc: ScaleParams) { return PT + PH - ((y - sc.yMin) / (sc.yMax - sc.yMin)) * PH }

interface ScaledPoint extends VizPoint { svgX: number; svgY: number }

function scoreColor(score: number, isDark: boolean): string {
  const t = Math.max(0, Math.min(1, (score + 0.15) / 1.15))
  if (isDark) {
    return `rgb(${Math.round(113 - t * 97)},${Math.round(113 + t * 72)},${Math.round(122 + t * 7)})`
  }
  return `rgb(${Math.round(161 - t * 145)},${Math.round(161 + t * 38)},${Math.round(170 - t * 66)})`
}

interface Props { collection: string; queryText: string }

export function QuerySimilarityGraph({ collection, queryText }: Props) {
  const isDark = useIsDark()
  const [panelHeight, setPanelHeight] = useState(210)
  const [basePoints, setBasePoints] = useState<VizPoint[]>([])
  const [scale, setScale] = useState<ScaleParams | null>(null)
  const [scaledBase, setScaledBase] = useState<ScaledPoint[]>([])
  const [queryPos, setQueryPos] = useState<{ svgX: number; svgY: number } | null>(null)
  const [scores, setScores] = useState<Map<string, number>>(new Map())
  const [topKOrder, setTopKOrder] = useState<string[]>([])
  const [hovered, setHovered] = useState<ScaledPoint | null>(null)
  const [fetching, setFetching] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startH: panelHeight }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - ev.clientY
      setPanelHeight(Math.max(MIN_H, Math.min(MAX_H, dragRef.current.startH + delta)))
    }
    const onUp = () => {
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    fetchCollectionViz(collection).then(raw => {
      if (!raw.length) return
      const sc = buildScale(raw)
      setScale(sc); setBasePoints(raw)
      setScaledBase(raw.map(p => ({ ...p, svgX: toSvgX(p.x, sc), svgY: toSvgY(p.y, sc) })))
    }).catch(() => {})
  }, [collection])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (queryText.length < 2 || !scale) {
      setQueryPos(null); setScores(new Map()); setTopKOrder([])
      return
    }
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setFetching(true)
      fetchQuerySimilarity(collection, queryText, ctrl.signal)
        .then(res => {
          if (!res.query || !scale) return
          setQueryPos({ svgX: toSvgX(res.query.x, scale), svgY: toSvgY(res.query.y, scale) })
          const newScores = new Map<string, number>()
          const topK: string[] = []
          res.chunks.forEach((c, i) => {
            newScores.set(c.doc_id, c.score ?? 0)
            if (i < TOP_K) topK.push(c.doc_id)
          })
          setScores(newScores)
          setTopKOrder(topK)
        })
        .catch(() => {})
        .finally(() => setFetching(false))
    }, 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [queryText, collection, scale])

  if (basePoints.length === 0) return null

  const topKSet = new Set(topKOrder)

  const c = isDark ? {
    bg: '#09090b', container: 'bg-zinc-950 border-zinc-800',
    handle: 'bg-zinc-700', handleHover: 'group-hover:bg-violet-500',
    header: 'text-zinc-600',
    grid: 'rgba(255,255,255,0.055)', axisLine: 'rgba(255,255,255,0.13)',
    tick: 'rgba(161,161,170,0.55)', axisLbl: 'rgba(113,113,122,0.45)',
    zero: 'rgba(124,58,237,0.16)',
    defaultDot: 'rgba(113,113,122,0.55)',
    tipBg: '#18181b', tipBorder: '#3f3f46', tipText: 'rgba(161,161,170,0.9)',
  } : {
    bg: '#f9fafb', container: 'bg-zinc-50 border-zinc-300',
    handle: 'bg-zinc-300', handleHover: 'group-hover:bg-violet-500',
    header: 'text-zinc-500',
    grid: 'rgba(0,0,0,0.06)', axisLine: 'rgba(0,0,0,0.2)',
    tick: 'rgba(63,63,70,0.7)', axisLbl: 'rgba(82,82,91,0.55)',
    zero: 'rgba(124,58,237,0.2)',
    defaultDot: 'rgba(113,113,122,0.45)',
    tipBg: '#ffffff', tipBorder: '#d4d4d8', tipText: 'rgba(63,63,70,0.9)',
  }

  return (
    <div
      className={`relative select-none overflow-hidden border-b-2 ${c.container}`}
      style={{ height: panelHeight }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-3.5 z-30 flex items-center justify-center cursor-ns-resize group"
        onMouseDown={startResize}
        title="Drag to resize"
      >
        <div className={`w-12 h-0.5 rounded-full transition-colors ${c.handle} ${c.handleHover}`} />
      </div>

      {/* Status header */}
      <div className={`absolute left-0 right-0 flex items-center gap-2 px-3 z-10 ${c.header}`} style={{ top: 14 }}>
        <span className="label-upper">Live Similarity</span>
        {fetching && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
        )}
        {queryPos && !fetching && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="label-upper text-violet-500 ml-auto">
            top-{TOP_K} highlighted
          </motion.span>
        )}
        {!queryPos && (
          <span className="label-upper ml-auto" style={{ opacity: 0.4 }}>PC1 / PC2</span>
        )}
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHovered(null)}
      >
        <rect width={W} height={H} fill={c.bg} />

        {/* Grid */}
        {scale?.xTicks.map(tick => {
          const sx = toSvgX(tick, scale)
          if (sx < PL - 1 || sx > PL + PW + 1) return null
          return (
            <g key={`xg-${tick}`}>
              <line x1={sx} y1={PT} x2={sx} y2={PT + PH} stroke={c.grid} strokeWidth="0.7" />
              <text x={sx} y={PT + PH + 12} textAnchor="middle"
                    fontSize="8.5" fontFamily="ui-monospace,monospace" fill={c.tick}>{fmt(tick)}</text>
            </g>
          )
        })}
        {scale?.yTicks.map(tick => {
          const sy = toSvgY(tick, scale)
          if (sy < PT - 1 || sy > PT + PH + 1) return null
          return (
            <g key={`yg-${tick}`}>
              <line x1={PL} y1={sy} x2={PL + PW} y2={sy} stroke={c.grid} strokeWidth="0.7" />
              <text x={PL - 5} y={sy + 3} textAnchor="end"
                    fontSize="8.5" fontFamily="ui-monospace,monospace" fill={c.tick}>{fmt(tick)}</text>
            </g>
          )
        })}

        {/* Zero crossing */}
        {scale && scale.xMin <= 0 && scale.xMax >= 0 && (
          <line x1={toSvgX(0, scale)} y1={PT} x2={toSvgX(0, scale)} y2={PT + PH}
                stroke={c.zero} strokeWidth="0.8" />
        )}
        {scale && scale.yMin <= 0 && scale.yMax >= 0 && (
          <line x1={PL} y1={toSvgY(0, scale)} x2={PL + PW} y2={toSvgY(0, scale)}
                stroke={c.zero} strokeWidth="0.8" />
        )}

        {/* Axis borders */}
        <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke={c.axisLine} strokeWidth="0.8" />
        <line x1={PL} y1={PT + PH} x2={PL + PW} y2={PT + PH} stroke={c.axisLine} strokeWidth="0.8" />

        {/* Axis labels */}
        <text x={PL + PW / 2} y={H - 2} textAnchor="middle"
              fontSize="8" fontFamily="ui-monospace,monospace" fill={c.axisLbl}>PC 1</text>
        <text x={9} y={PT + PH / 2} textAnchor="middle"
              fontSize="8" fontFamily="ui-monospace,monospace" fill={c.axisLbl}
              transform={`rotate(-90, 9, ${PT + PH / 2})`}>PC 2</text>

        <defs>
          <radialGradient id="qs-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connecting lines */}
        <AnimatePresence>
          {queryPos && topKOrder.map((docId, rank) => {
            const p = scaledBase.find(pt => pt.doc_id === docId)
            if (!p) return null
            const seg = edgeLine(queryPos.svgX, queryPos.svgY, p.svgX, p.svgY, Q_R, C_R_TOP)
            if (!seg) return null
            return (
              <motion.line
                key={`line-${docId}`}
                x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke="#7C3AED"
                strokeWidth={1.6 - rank * 0.1}
                strokeDasharray="5 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 - rank * 0.04 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: rank * 0.03 }}
              />
            )
          })}
        </AnimatePresence>

        {/* Pulsing rings */}
        <AnimatePresence>
          {queryPos && topKOrder.map((docId, rank) => {
            const p = scaledBase.find(pt => pt.doc_id === docId)
            if (!p) return null
            return (
              <motion.circle
                key={`pulse-${docId}`}
                cx={p.svgX} cy={p.svgY}
                fill="none" stroke="#7C3AED" strokeWidth="1.2"
                style={{ pointerEvents: 'none' }}
                initial={{ r: C_R_TOP, opacity: 0.65 }}
                animate={{ r: C_R_TOP + 10, opacity: 0 }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.4, delay: rank * 0.12, ease: 'easeOut' }}
              />
            )
          })}
        </AnimatePresence>

        {/* All chunk dots */}
        {scaledBase.map(p => {
          const score = scores.get(p.doc_id) ?? 0
          const isTop = topKSet.has(p.doc_id)
          const color = queryPos ? scoreColor(score, isDark) : c.defaultDot
          const r = queryPos ? (isTop ? C_R_TOP : 3.5 + Math.max(0, score) * 1.8) : 3.8
          return (
            <motion.circle
              key={p.doc_id}
              cx={p.svgX} cy={p.svgY}
              fill={color}
              stroke={isTop && queryPos ? '#7C3AED' : 'none'}
              strokeWidth="1.2"
              r={3.8}
              fillOpacity={0.9}
              animate={{ r, fillOpacity: queryPos && !isTop ? 0.32 : 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}

        {/* Rank labels */}
        <AnimatePresence>
          {queryPos && topKOrder.map((docId, rank) => {
            const p = scaledBase.find(pt => pt.doc_id === docId)
            if (!p) return null
            return (
              <motion.text
                key={`rank-${docId}`}
                x={p.svgX} y={p.svgY - C_R_TOP - 3}
                textAnchor="middle" fontSize="7.5" fontFamily="ui-monospace,monospace"
                fill="#7C3AED" style={{ pointerEvents: 'none' }}
                initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: rank * 0.03 }}
              >
                #{rank + 1}
              </motion.text>
            )
          })}
        </AnimatePresence>

        {/* Query glow + dot */}
        <AnimatePresence>
          {queryPos && (
            <>
              <motion.circle key="halo" cx={queryPos.svgX} cy={queryPos.svgY}
                fill="url(#qs-glow)"
                initial={{ r: 0, opacity: 0 }} animate={{ r: 20, opacity: 1 }} exit={{ r: 0, opacity: 0 }}
                transition={{ duration: 0.3 }} />
              <motion.circle key="dot" fill="#7C3AED" r={Q_R} stroke="#fff" strokeWidth="1.5"
                initial={{ cx: queryPos.svgX, cy: queryPos.svgY, opacity: 0, scale: 0 }}
                animate={{ cx: queryPos.svgX, cy: queryPos.svgY, opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  cx: { type: 'spring', stiffness: 160, damping: 20 },
                  cy: { type: 'spring', stiffness: 160, damping: 20 },
                  opacity: { duration: 0.2 }, scale: { duration: 0.2 },
                }} />
            </>
          )}
        </AnimatePresence>

        {/* Hover tooltip */}
        {hovered && (
          <foreignObject
            x={Math.min(hovered.svgX + 8, W - 170)} y={Math.max(hovered.svgY - 56, PT)}
            width="162" height="56" style={{ overflow: 'visible', pointerEvents: 'none' }}>
            <div style={{ background: c.tipBg, border: `1px solid ${c.tipBorder}` }}
                 className="px-2 py-1.5">
              <p className="label-upper mb-0.5 flex justify-between" style={{ color: c.tipText, opacity: 0.7 }}>
                <span>
                  {topKSet.has(hovered.doc_id) && (
                    <span style={{ color: '#7C3AED', marginRight: 4 }}>
                      #{topKOrder.indexOf(hovered.doc_id) + 1}
                    </span>
                  )}
                  chunk #{hovered.chunk_index}
                </span>
                {queryPos && (
                  <span style={{ color: '#10b981' }}>
                    {((scores.get(hovered.doc_id) ?? 0) * 100).toFixed(0)}%
                  </span>
                )}
              </p>
              <p className="font-mono leading-snug" style={{ fontSize: 9, color: c.tipText }}>
                {hovered.preview.slice(0, 58)}{hovered.preview.length > 58 ? '…' : ''}
              </p>
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  )
}
