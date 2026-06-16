import { orderedWeekdays, weekdayShort, weekdayName } from '../lib/format'
import type { Weekday } from '../engine'

interface WeekdayPickerProps {
  weekStart: 0 | 1
  graded: boolean
  guessed?: Weekday | null
  correct?: Weekday | null
  onPick: (w: Weekday) => void
}

export function WeekdayPicker({ weekStart, graded, guessed, correct, onPick }: WeekdayPickerProps) {
  return (
    <div
      role="group"
      aria-label="Choose the weekday"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}
    >
      {orderedWeekdays(weekStart).map((w) => {
        const isCorrect = graded && correct === w
        const isWrongPick = graded && guessed === w && correct !== w
        const bg = isCorrect ? 'var(--green)' : isWrongPick ? 'var(--burg)' : 'var(--card)'
        const fg = isCorrect || isWrongPick ? '#fff' : 'var(--ink)'
        const border = isCorrect ? 'var(--green)' : isWrongPick ? 'var(--burg)' : 'var(--line)'
        const mark = isCorrect ? ' ✓' : isWrongPick ? ' ✕' : ''
        return (
          <button
            key={w}
            type="button"
            disabled={graded}
            aria-label={weekdayName(w)}
            onClick={() => onPick(w)}
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
            {weekdayShort(w)}
            {mark}
          </button>
        )
      })}
    </div>
  )
}
