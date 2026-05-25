import { useState } from 'react'

function makeId(): string {
  return crypto.randomUUID()
}

export function useSession() {
  const [sessionId] = useState<string>(() => {
    const stored = sessionStorage.getItem('rag_session_id')
    if (stored) return stored
    const id = makeId()
    sessionStorage.setItem('rag_session_id', id)
    return id
  })

  function resetSession(): string {
    const id = makeId()
    sessionStorage.setItem('rag_session_id', id)
    // Reload so all state is clean
    window.location.reload()
    return id
  }

  return { sessionId, resetSession }
}
