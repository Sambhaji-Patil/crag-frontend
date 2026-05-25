import { useState, useRef, useCallback } from 'react'
import { Header } from './components/Header'
import { WorkspacePanel } from './components/WorkspacePanel'
import { ChatPanel } from './components/ChatPanel'
import { PipelinePanel } from './components/PipelinePanel'
import { ResizeHandle } from './components/ResizeHandle'
import { DocViewerModal } from './components/DocViewerModal'
import { DocViewerProvider } from './contexts/DocViewerContext'
import { EmbeddingVizModal } from './components/EmbeddingVizModal'
import { EmbeddingVizProvider } from './contexts/EmbeddingVizContext'
import { useSession } from './hooks/useSession'
import { useTheme } from './hooks/useTheme'
import { streamPipeline } from './lib/api'
import type { ChatMessage, IngestedDoc, PipelineStep, Source } from './types'

function uuid() {
  return crypto.randomUUID()
}

export default function App() {
  const { sessionId, resetSession } = useSession()
  const { theme, toggle: toggleTheme } = useTheme()
  const [docs, setDocs] = useState<IngestedDoc[]>([])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const streamingRef = useRef('')

  // Retrieval mode
  const [retrievalMode, setRetrievalMode] = useState('hybrid')

  // Resizable panel widths (px)
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(320)

  const handleResizeLeft = useCallback((delta: number) => {
    setLeftWidth((w) => Math.max(180, Math.min(440, w + delta)))
  }, [])

  const handleResizeRight = useCallback((delta: number) => {
    setRightWidth((w) => Math.max(200, Math.min(480, w - delta)))
  }, [])

  async function handleQuery(query: string) {
    if (isProcessing) return

    setIsProcessing(true)
    setPipelineSteps([])
    setStreamingText('')
    streamingRef.current = ''

    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    setMessages((prev) => [...prev, { id: uuid(), role: 'user', content: query }])

    let finalAnswer = ''
    let finalSources: Source[] = []
    let rewrittenQuery: string | undefined
    let latencyMs: number | undefined
    const steps: PipelineStep[] = []

    try {
      const docCollections = docs
        .filter((d) => d.status === 'done' && d.collection)
        .map((d) => d.collection!)

      for await (const event of streamPipeline(query, sessionId, history, retrievalMode, docCollections)) {
        const step: PipelineStep = {
          event: event.event,
          status: event.status,
          data: event.data,
          arrivedAt: performance.now(),
        }

        if (event.event === 'token') {
          const token = (event.data as { text: string }).text ?? ''
          streamingRef.current += token
          setStreamingText(streamingRef.current)
        } else if (event.event === 'complete') {
          finalAnswer = (event.data as { answer: string }).answer ?? streamingRef.current
          finalSources = (event.data as { sources: Source[] }).sources ?? []
          rewrittenQuery = (event.data as { rewritten_query?: string }).rewritten_query
          latencyMs = (event.data as { latency_ms?: number }).latency_ms
          steps.push(step)
          setPipelineSteps([...steps])
        } else {
          steps.push(step)
          setPipelineSteps([...steps])
        }
      }
    } catch (err) {
      finalAnswer = `Error: ${err instanceof Error ? err.message : 'Request failed'}`
    }

    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: 'assistant',
        content: finalAnswer,
        sources: finalSources,
        rewrittenQuery,
        latencyMs,
        pipelineSnapshot: steps,
      },
    ])

    setStreamingText('')
    streamingRef.current = ''
    setIsProcessing(false)
  }

  const hasDocuments = docs.some((d) => d.status === 'done')

  return (
    <EmbeddingVizProvider>
    <DocViewerProvider docs={docs}>
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Header
        sessionId={sessionId}
        onReset={resetSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left — Workspace */}
        <WorkspacePanel
          sessionId={sessionId}
          docs={docs}
          onDocsChange={setDocs}
          style={{ width: leftWidth, flexShrink: 0 }}
        />

        <ResizeHandle onResize={handleResizeLeft} />

        {/* Center — Chat */}
        <ChatPanel
          messages={messages}
          streamingText={isProcessing ? streamingText : ''}
          isProcessing={isProcessing}
          hasDocuments={hasDocuments}
          onQuery={handleQuery}
          retrievalMode={retrievalMode}
          onRetrievalModeChange={setRetrievalMode}
          docs={docs}
        />

        <ResizeHandle onResize={handleResizeRight} />

        {/* Right — Pipeline */}
        <PipelinePanel
          steps={pipelineSteps}
          isProcessing={isProcessing}
          style={{ width: rightWidth, flexShrink: 0 }}
        />
      </div>

      <DocViewerModal />
      <EmbeddingVizModal />
    </div>
    </DocViewerProvider>
    </EmbeddingVizProvider>
  )
}
