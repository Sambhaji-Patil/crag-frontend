import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SourceCards } from './SourceCards'
import type { ChatMessage as ChatMessageType } from '../types'

const mdComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h1: ({ children }: any) => <h1 className="text-base font-bold mb-2 mt-1">{children}</h1>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h2: ({ children }: any) => <h2 className="text-sm font-bold mb-1.5 mt-1">{children}</h2>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h3: ({ children }: any) => <h3 className="text-xs font-bold mb-1 mt-1">{children}</h3>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  em: ({ children }: any) => <em className="italic">{children}</em>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-violet-500 pl-3 my-2 text-zinc-500 dark:text-zinc-400 italic">
      {children}
    </blockquote>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ inline, children }: any) =>
    inline ? (
      <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[11px] font-mono rounded text-violet-600 dark:text-violet-400">
        {children}
      </code>
    ) : (
      <pre className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 my-2 overflow-x-auto text-[11px] font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hr: () => <hr className="border-zinc-200 dark:border-zinc-700 my-2" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs w-full border-collapse border border-zinc-200 dark:border-zinc-700">{children}</table>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  th: ({ children }: any) => (
    <th className="border border-zinc-200 dark:border-zinc-700 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 font-bold text-left">
      {children}
    </th>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  td: ({ children }: any) => (
    <td className="border border-zinc-200 dark:border-zinc-700 px-2 py-1">{children}</td>
  ),
}

interface Props {
  message: ChatMessageType
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%]">
          <div className="
            bg-violet-600 border-2 border-violet-500 shadow-brutal
            px-4 py-3 text-sm text-white
          ">
            {message.content}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[90%] w-full">
        {/* Rewritten query badge */}
        {message.rewrittenQuery && message.rewrittenQuery !== message.content && (
          <div className="mb-2 flex items-center gap-2">
            <span className="label-upper text-violet-600 dark:text-violet-600">query rewrite</span>
            <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 truncate max-w-[280px]">
              → {message.rewrittenQuery}
            </span>
          </div>
        )}

        {/* Answer card */}
        <div className="
          card border-2 border-zinc-200 dark:border-zinc-700 shadow-brutal-muted
          px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Latency + metadata row */}
        {message.latencyMs !== undefined && (
          <div className="mt-1.5 flex items-center gap-3">
            <span className="label-upper text-zinc-400 dark:text-zinc-700">
              {(message.latencyMs / 1000).toFixed(2)}s
            </span>
            {message.sources && message.sources.length > 0 && (
              <span className="label-upper text-zinc-400 dark:text-zinc-700">
                {message.sources.length} sources
              </span>
            )}
          </div>
        )}

        {/* Source cards */}
        {message.sources && message.sources.length > 0 && (
          <SourceCards sources={message.sources} />
        )}
      </div>
    </motion.div>
  )
}

interface StreamingBubbleProps {
  text: string
}

export function StreamingBubble({ text }: StreamingBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[90%] w-full">
        <div className="
          card border-2 border-violet-400 dark:border-violet-800 shadow-brutal
          px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed
          whitespace-pre-wrap
        ">
          {text || <span className="text-zinc-400 dark:text-zinc-600">Generating</span>}
          <span className="cursor-blink" />
        </div>
      </div>
    </motion.div>
  )
}
