interface NumberPadProps {
  options: number[]
  graded: boolean
  guessed?: number | null
  correct?: number | null
  onPick: (n: number) => void
  columns?: number
}

export function NumberPad({ options, graded, guessed, correct, onPick, columns }: NumberPadProps) {
  return (
    <div
      role="group"
      aria-label="Choose the number"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${columns ?? 4}, 1fr)`, gap: 12 }}
    >
      {options.map((n) => {
        const isCorrect = graded && correct === n
        const isWrongPick = graded && guessed === n && correct !== n
        const bg = isCorrect ? 'var(--green)' : isWrongPick ? 'var(--burg)' : 'var(--card)'
        const fg = isCorrect || isWrongPick ? '#fff' : 'var(--ink)'
        const border = isCorrect ? 'var(--green)' : isWrongPick ? 'var(--burg)' : 'var(--line)'
        const mark = isCorrect ? ' ✓' : isWrongPick ? ' ✕' : ''
        return (
          <button
            key={n}
            type="button"
            disabled={graded}
            aria-label={String(n)}
            onClick={() => onPick(n)}
            style={{
              minHeight: 'var(--tap)',
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: bg,
              color: fg,
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {String(n)}
            {mark}
          </button>
        )
      })}
    </div>
  )
}
