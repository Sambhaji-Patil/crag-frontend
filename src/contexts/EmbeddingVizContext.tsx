import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface VizState {
  collection: string
  filename: string
}

interface EmbeddingVizContextValue {
  vizState: VizState | null
  openViz: (collection: string, filename: string) => void
  closeViz: () => void
}

const EmbeddingVizContext = createContext<EmbeddingVizContextValue | null>(null)

export function EmbeddingVizProvider({ children }: { children: ReactNode }) {
  const [vizState, setVizState] = useState<VizState | null>(null)

  const openViz = useCallback((collection: string, filename: string) => {
    setVizState({ collection, filename })
  }, [])

  const closeViz = useCallback(() => setVizState(null), [])

  return (
    <EmbeddingVizContext.Provider value={{ vizState, openViz, closeViz }}>
      {children}
    </EmbeddingVizContext.Provider>
  )
}

export function useEmbeddingViz() {
  const ctx = useContext(EmbeddingVizContext)
  if (!ctx) throw new Error('useEmbeddingViz must be used within EmbeddingVizProvider')
  return ctx
}
