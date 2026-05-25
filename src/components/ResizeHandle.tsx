import { useCallback } from 'react'

interface Props {
  onResize: (delta: number) => void
}

export function ResizeHandle({ onResize }: Props) {
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      let lastX = e.clientX

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - lastX
        lastX = ev.clientX
        onResize(delta)
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [onResize]
  )

  return (
    <div
      onMouseDown={onMouseDown}
      className="
        w-[3px] flex-shrink-0 cursor-col-resize z-10 relative
        bg-zinc-200 dark:bg-zinc-800
        hover:bg-violet-500 dark:hover:bg-violet-600
        transition-colors duration-150
      "
    >
      {/* Wider invisible hit area */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  )
}
