import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChatMessage, StreamingBubble } from './ChatMessage'
import { QueryInput } from './QueryInput'
import { QuerySimilarityGraph } from './QuerySimilarityGraph'
import type { ChatMessage as ChatMessageType, IngestedDoc } from '../types'

interface Props {
  messages: ChatMessageType[]
  streamingText: string
  isProcessing: boolean
  hasDocuments: boolean
  onQuery: (query: string) => void
  retrievalMode: string
  onRetrievalModeChange: (mode: string) => void
  embeddingMode: string
  onEmbeddingModeChange: (mode: string) => void
  embeddingRecommendedMode?: string
  embeddingDevice?: string
  docs: IngestedDoc[]
}

export function ChatPanel({
  messages,
  streamingText,
  isProcessing,
  hasDocuments,
  onQuery,
  retrievalMode,
  onRetrievalModeChange,
  embeddingMode,
  onEmbeddingModeChange,
  embeddingRecommendedMode,
  embeddingDevice,
  docs,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [liveQuery, setLiveQuery] = useState('')

  // Single loaded doc for live similarity graph
  const doneDocs = docs.filter(d => d.status === 'done' && d.collection)
  const singleDoc = doneDocs.length === 1 ? doneDocs[0] : null
  const showSimilarity = singleDoc !== null && liveQuery.length >= 2 && !isProcessing

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const isEmpty = messages.length === 0 && !isProcessing

  return (
    <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-5">
            {/* Hero icon */}
            <div className="w-16 h-16 border-2 border-zinc-300 dark:border-zinc-700 shadow-brutal flex items-center justify-center bg-white dark:bg-transparent">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="2" y="2" width="10" height="10" stroke="#7C3AED" strokeWidth="2" />
                <rect x="16" y="2" width="10" height="10" stroke="#7C3AED" strokeWidth="2" opacity="0.5" />
                <rect x="2" y="16" width="10" height="10" stroke="#7C3AED" strokeWidth="2" opacity="0.5" />
                <rect x="16" y="16" width="10" height="10" stroke="#7C3AED" strokeWidth="2" opacity="0.3" />
                <line x1="12" y1="7" x2="16" y2="7" stroke="#7C3AED" strokeWidth="2" />
                <line x1="7" y1="12" x2="7" y2="16" stroke="#7C3AED" strokeWidth="2" />
              </svg>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
                Retrieval-Augmented Generation
              </h2>
              <p className="text-sm text-zinc-500 max-w-sm">
                Upload your documents in the workspace panel, then ask anything. Watch the full pipeline execute in real time.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {[
                'Adaptive embeddings (BGE/OpenAI)',
                'Hybrid RRF retrieval',
                'Cross-encoder reranking',
                'Parent-child context',
                'Semantic caching',
                'Llama Guard safety',
              ].map((f) => (
                <span key={f} className="badge-zinc text-[10px]">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {isProcessing && streamingText && (
          <StreamingBubble text={streamingText} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Live similarity graph (single doc only) */}
      <AnimatePresence>
        {showSimilarity && (
          <motion.div
            key="sim-graph"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden flex-shrink-0"
          >
            <QuerySimilarityGraph
              collection={singleDoc!.collection!}
              queryText={liveQuery}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <QueryInput
        onSubmit={onQuery}
        disabled={isProcessing}
        hasDocuments={hasDocuments}
        retrievalMode={retrievalMode}
        onRetrievalModeChange={onRetrievalModeChange}
        embeddingMode={embeddingMode}
        onEmbeddingModeChange={onEmbeddingModeChange}
        embeddingRecommendedMode={embeddingRecommendedMode}
        embeddingDevice={embeddingDevice}
        onQueryChange={setLiveQuery}
      />
    </main>
  )
}
