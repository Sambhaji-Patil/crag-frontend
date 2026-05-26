export interface PipelineEvent {
  event: string
  status: 'in_progress' | 'done' | 'passed' | 'blocked' | 'hit' | 'miss' | 'skipped' | 'empty' | string
  data: Record<string, unknown>
}

export interface ChunkPreview {
  doc_id: string
  score: number
  preview: string
  source: string
  chunk_index: number
}

export interface Source {
  doc_id: string
  content: string
  metadata: Record<string, unknown>
  relevance_score: number
}

export interface PipelineStep {
  event: string
  status: string
  data: Record<string, unknown>
  arrivedAt: number // performance.now() timestamp
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  rewrittenQuery?: string
  latencyMs?: number
  pipelineSnapshot?: PipelineStep[]
}

export interface IngestJob {
  job_id: string
  status: 'processing' | 'done' | 'failed'
  collection_name: string
  filename: string
  embedding_mode?: string
  chunks_created: number
  message: string
  progress: number
}

export interface EmbeddingInfo {
  default_mode: string
  device: string
}

export interface IngestedDoc {
  filename: string
  jobId: string
  chunks: number
  status: 'processing' | 'done' | 'failed'
  progress: number
  message?: string
  collection?: string   // per-doc FAISS sub-collection name returned by backend
}

export interface VizPoint {
  doc_id: string
  x: number
  y: number
  preview: string
  page: number | null
  source: string
  chunk_index: number
  score?: number  // only present in query_similarity response
}

export interface QuerySimilarityResult {
  query: { x: number; y: number } | null
  chunks: VizPoint[]
}
