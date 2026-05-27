import type { IngestJob, PipelineEvent, VizPoint, QuerySimilarityResult, TryDoc, RetrievalSettings } from '../types'

export const API_BASE = import.meta.env.VITE_API_URL ?? 'https://quantumbit-crag.hf.space'
const API_BEARER_TOKEN = import.meta.env.VITE_API_BEARER_TOKEN ?? ''

function authHeaders(initHeaders: HeadersInit = {}): Headers {
  const headers = new Headers(initHeaders)
  if (API_BEARER_TOKEN) {
    headers.set('Authorization', `Bearer ${API_BEARER_TOKEN}`)
  }
  return headers
}

function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: authHeaders(init.headers ?? {}),
  })
}

// ── Query pipeline ──────────────────────────────────────────────────────────

export async function* streamPipeline(
  query: string,
  sessionId: string,
  history: { role: string; content: string }[],
  retrievalMode: string = 'hybrid',
  docCollections: string[] = [],
  embeddingMode: string = 'auto',
  retrievalSettings?: RetrievalSettings
): AsyncGenerator<PipelineEvent> {
  const res = await authFetch(`${API_BASE}/query/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      collection_name: sessionId,
      session_id: sessionId,
      history,
      stream: false,
      retrieval_mode: retrievalMode,
      embedding_mode: embeddingMode,
      top_k: retrievalSettings?.topK,
      top_k_retrieval: retrievalSettings?.topKRetrieval,
      mmr_lambda: retrievalSettings?.mmrLambda,
      bm25_weight: retrievalSettings?.bm25Weight,
      vector_weight: retrievalSettings?.vectorWeight,
      doc_collections: docCollections.length > 0 ? docCollections : null,
    }),
  })

  if (!res.ok) {
    throw new Error(`Pipeline request failed: ${res.status}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') return
      try {
        yield JSON.parse(raw) as PipelineEvent
      } catch {
        // skip malformed lines
      }
    }
  }
}

// ── Ingest ──────────────────────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  sessionId: string,
  embeddingMode: string = 'auto'
): Promise<{ job_id: string }> {
  const form = new FormData()
  form.append('file', file)

  const res = await authFetch(
    `${API_BASE}/ingest/file?collection_name=${encodeURIComponent(sessionId)}&embedding_mode=${encodeURIComponent(embeddingMode)}`,
    {
      method: 'POST',
      body: form,
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail ?? 'Upload failed')
  }

  return res.json()
}

export function watchIngestJob(
  jobId: string,
  onUpdate: (job: IngestJob) => void
): () => void {
  const controller = new AbortController()

  void (async () => {
    const res = await authFetch(`${API_BASE}/ingest/jobs/${jobId}/events`, {
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            onUpdate(JSON.parse(raw) as IngestJob)
          } catch {
            // ignore malformed event payloads
          }
        }
      }
    } catch {
      // stream closed or aborted
    } finally {
      reader.releaseLock()
    }
  })()

  return () => controller.abort()
}

// ── Embeddings ─────────────────────────────────────────────────────────────

export async function fetchEmbeddingInfo(): Promise<{ default_mode: string; device: string }> {
  const res = await authFetch(`${API_BASE}/embeddings/info`)
  if (!res.ok) throw new Error(`Embeddings info failed: ${res.status}`)
  return res.json() as Promise<{ default_mode: string; device: string }>
}

// ── Try Docs ───────────────────────────────────────────────────────────────

export async function fetchTryDocs(): Promise<TryDoc[]> {
  const res = await authFetch(`${API_BASE}/try_docs`)
  if (!res.ok) throw new Error(`Try Docs fetch failed: ${res.status}`)
  const data = await res.json() as { docs: TryDoc[] }
  return data.docs
}

// ── Visualization ────────────────────────────────────────────────────────────

export async function fetchCollectionViz(collection: string): Promise<VizPoint[]> {
  const res = await authFetch(`${API_BASE}/collections/${encodeURIComponent(collection)}/viz`)
  if (!res.ok) throw new Error(`Viz fetch failed: ${res.status}`)
  const data = await res.json()
  return data.points as VizPoint[]
}

export async function fetchQuerySimilarity(
  collection: string,
  query: string,
  signal?: AbortSignal
): Promise<QuerySimilarityResult> {
  const res = await authFetch(
    `${API_BASE}/collections/${encodeURIComponent(collection)}/query_similarity`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal,
    }
  )
  if (!res.ok) throw new Error(`Similarity fetch failed: ${res.status}`)
  return res.json() as Promise<QuerySimilarityResult>
}
