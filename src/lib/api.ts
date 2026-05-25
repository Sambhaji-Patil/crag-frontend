import type { IngestJob, PipelineEvent, VizPoint, QuerySimilarityResult } from '../types'

export const API_BASE = import.meta.env.VITE_API_URL ?? 'https://quantumbit-crag.hf.space'

// ── Query pipeline ──────────────────────────────────────────────────────────

export async function* streamPipeline(
  query: string,
  sessionId: string,
  history: { role: string; content: string }[],
  retrievalMode: string = 'hybrid',
  docCollections: string[] = []
): AsyncGenerator<PipelineEvent> {
  const res = await fetch(`${API_BASE}/query/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      collection_name: sessionId,
      session_id: sessionId,
      history,
      stream: false,
      retrieval_mode: retrievalMode,
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
  sessionId: string
): Promise<{ job_id: string }> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${API_BASE}/ingest/file?collection_name=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    body: form,
  })

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
  const es = new EventSource(`${API_BASE}/ingest/jobs/${jobId}/events`)

  es.onmessage = (e) => {
    try {
      onUpdate(JSON.parse(e.data) as IngestJob)
    } catch {
      // ignore
    }
  }

  es.onerror = () => es.close()

  return () => es.close()
}

// ── Visualization ────────────────────────────────────────────────────────────

export async function fetchCollectionViz(collection: string): Promise<VizPoint[]> {
  const res = await fetch(`${API_BASE}/collections/${encodeURIComponent(collection)}/viz`)
  if (!res.ok) throw new Error(`Viz fetch failed: ${res.status}`)
  const data = await res.json()
  return data.points as VizPoint[]
}

export async function fetchQuerySimilarity(
  collection: string,
  query: string,
  signal?: AbortSignal
): Promise<QuerySimilarityResult> {
  const res = await fetch(
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
