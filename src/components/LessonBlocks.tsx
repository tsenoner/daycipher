import type { Block } from '../features/learn/curriculum'
import { CURRENT_YEAR, thisYearDoomsday } from '../engine'
import { weekdayName } from '../lib/format'
import { WorkedExample } from './WorkedExample'

// Resolved once at module load (CURRENT_YEAR is itself a module-load constant),
// so interpolate() doesn't recompute the year's doomsday per block per render.
const THIS_YEAR = String(CURRENT_YEAR)
const THIS_YEAR_DOOMSDAY = weekdayName(thisYearDoomsday())

/** Replace runtime tokens so "this year" facts never go stale in the copy. */
function interpolate(text: string): string {
  return text.replaceAll('{thisYear}', THIS_YEAR).replaceAll('{thisYearDoomsday}', THIS_YEAR_DOOMSDAY)
}

export function LessonBlocks({ blocks, stageId }: { blocks: Block[]; stageId: string }) {
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
            return <WorkedExample key={i} stageId={stageId} hero={b} />
        }
      })}
    </div>
  )
}
