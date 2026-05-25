import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { IngestedDoc } from '../types'

interface ViewerState {
  collection: string
  filename: string
  page: number
}

interface DocViewerContextValue {
  viewer: ViewerState | null
  open: (collection: string, filename: string, page?: number) => void
  close: () => void
  getCollectionByFilename: (filename: string) => string | null
  docs: IngestedDoc[]
}

const DocViewerContext = createContext<DocViewerContextValue | null>(null)

export function DocViewerProvider({ children, docs }: { children: ReactNode; docs: IngestedDoc[] }) {
  const [viewer, setViewer] = useState<ViewerState | null>(null)

  const open = useCallback((collection: string, filename: string, page = 1) => {
    setViewer({ collection, filename, page })
  }, [])

  const close = useCallback(() => setViewer(null), [])

  const getCollectionByFilename = useCallback(
    (filename: string): string | null => {
      const doc = docs.find(
        (d) => d.status === 'done' && d.collection &&
          (d.filename === filename || d.filename.split(/[/\\]/).pop() === filename)
      )
      return doc?.collection ?? null
    },
    [docs]
  )

  return (
    <DocViewerContext.Provider value={{ viewer, open, close, getCollectionByFilename, docs }}>
      {children}
    </DocViewerContext.Provider>
  )
}

export function useDocViewer() {
  const ctx = useContext(DocViewerContext)
  if (!ctx) throw new Error('useDocViewer must be used within DocViewerProvider')
  return ctx
}
