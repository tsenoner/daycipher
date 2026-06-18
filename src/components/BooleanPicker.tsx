interface BooleanPickerProps {
  graded: boolean
  guessed?: 0 | 1 | null
  correct?: 0 | 1 | null
  onPick: (value: 0 | 1) => void
}

const OPTIONS: { value: 0 | 1; label: string }[] = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' },
]

export function BooleanPicker({ graded, guessed, correct, onPick }: BooleanPickerProps) {
  return (
    <div
      role="group"
      aria-label="Choose yes or no"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
    >
      {OPTIONS.map(({ value, label }) => {
        const isCorrect = graded && correct === value
        const isWrongPick = graded && guessed === value && correct !== value
        const bg = isCorrect ? 'var(--green)' : isWrongPick ? 'var(--burg)' : 'var(--card)'
        const fg = isCorrect || isWrongPick ? '#fff' : 'var(--ink)'
        const border = isCorrect ? 'var(--green)' : isWrongPick ? 'var(--burg)' : 'var(--line)'
        const mark = isCorrect ? ' ✓' : isWrongPick ? ' ✕' : ''
        return (
          <button
            key={value}
            type="button"
            disabled={graded}
            aria-label={label}
            onClick={() => onPick(value)}
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
            {label}
            {mark}
          </button>
        )
      })}
    </div>
  )
}
