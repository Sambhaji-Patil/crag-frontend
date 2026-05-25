interface HeaderProps {
  sessionId: string
  onReset: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function Header({ sessionId, onReset, theme, onToggleTheme }: HeaderProps) {
  const short = sessionId.slice(0, 8).toUpperCase()
  const isDark = theme === 'dark'

  return (
    <header className="border-b-2 border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center justify-between px-5 h-14">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-violet-600 border-2 border-violet-400 shadow-brutal-sm flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" fill="white" />
              <rect x="8" y="1" width="5" height="5" fill="white" opacity="0.6" />
              <rect x="1" y="8" width="5" height="5" fill="white" opacity="0.6" />
              <rect x="8" y="8" width="5" height="5" fill="white" opacity="0.3" />
            </svg>
          </div>
          <div>
            <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-sm">RAG</span>
            <span className="font-bold tracking-tight text-violet-600 dark:text-violet-400 text-sm"> PIPELINE</span>
          </div>
          <span className="hidden sm:block text-zinc-400 dark:text-zinc-700 text-xs font-mono">
            // production retrieval-augmented generation
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            <span className="label-upper">session</span>
            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{short}…</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="
              border-2 border-zinc-300 dark:border-zinc-700
              bg-zinc-100 dark:bg-zinc-900
              w-9 h-9 flex items-center justify-center
              text-zinc-500 dark:text-zinc-400
              hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400
              hover:shadow-brutal-sm transition-all duration-150
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
            "
          >
            {isDark ? (
              /* Sun — go light */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="2.5" />
                <line x1="7" y1="1" x2="7" y2="2.5" strokeLinecap="square" />
                <line x1="7" y1="11.5" x2="7" y2="13" strokeLinecap="square" />
                <line x1="1" y1="7" x2="2.5" y2="7" strokeLinecap="square" />
                <line x1="11.5" y1="7" x2="13" y2="7" strokeLinecap="square" />
                <line x1="2.93" y1="2.93" x2="3.99" y2="3.99" strokeLinecap="square" />
                <line x1="10.01" y1="10.01" x2="11.07" y2="11.07" strokeLinecap="square" />
                <line x1="11.07" y1="2.93" x2="10.01" y2="3.99" strokeLinecap="square" />
                <line x1="3.99" y1="10.01" x2="2.93" y2="11.07" strokeLinecap="square" />
              </svg>
            ) : (
              /* Moon — go dark */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z" />
              </svg>
            )}
          </button>

          <button
            onClick={onReset}
            className="
              border-2 border-zinc-300 dark:border-zinc-700
              bg-zinc-100 dark:bg-zinc-900
              px-3 py-1.5
              text-[11px] font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400
              hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:shadow-brutal-sm
              transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
            "
          >
            New Session
          </button>
        </div>
      </div>
    </header>
  )
}
