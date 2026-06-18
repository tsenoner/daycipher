import type { Block } from '../features/learn/curriculum'
import { CURRENT_YEAR, thisYearDoomsday } from '../engine'
import { weekdayName } from '../lib/format'

// Resolved once at module load (CURRENT_YEAR is itself a module-load constant),
// so interpolate() doesn't recompute the year's doomsday per block per render.
const THIS_YEAR = String(CURRENT_YEAR)
const THIS_YEAR_DOOMSDAY = weekdayName(thisYearDoomsday())

/** Replace runtime tokens so "this year" facts never go stale in the copy. */
function interpolate(text: string): string {
  return text.replaceAll('{thisYear}', THIS_YEAR).replaceAll('{thisYearDoomsday}', THIS_YEAR_DOOMSDAY)
}

export function LessonBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'h':
            return (
              <h3 key={i} style={{ marginTop: 20 }}>
                {interpolate(b.text)}
              </h3>
            )
          case 'p':
            return (
              <p key={i} style={{ lineHeight: 1.6 }}>
                {interpolate(b.text)}
              </p>
            )
          case 'list':
            return (
              <ul key={i} style={{ lineHeight: 1.7, paddingLeft: 20 }}>
                {b.items.map((it, j) => (
                  <li key={j}>{interpolate(it)}</li>
                ))}
              </ul>
            )
          case 'mnemonic':
            return (
              <div
                key={i}
                style={{
                  background: 'var(--card)',
                  borderLeft: '3px solid var(--gold)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  margin: '12px 0',
                  fontWeight: 600,
                }}
              >
                💡 {interpolate(b.text)}
              </div>
            )
          case 'example':
            return (
              <div
                key={i}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: 14,
                  margin: '12px 0',
                }}
              >
                <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>
                  {b.date}
                </div>
                <ol style={{ lineHeight: 1.7, paddingLeft: 20, marginTop: 8 }}>
                  {b.steps.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ol>
                <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--green)' }}>→ {b.answer}</div>
              </div>
            )
        }
      })}
    </div>
  )
}
