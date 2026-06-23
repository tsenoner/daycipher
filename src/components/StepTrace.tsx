import { monthName, weekdayName, formatYear, formatCentury, ordinal } from '../lib/format'
import { centuryOf, type StepTrace as Trace } from '../engine'

interface StepTraceProps {
  trace: Trace
  defaultOpen?: boolean
}

export function StepTrace({ trace, defaultOpen = false }: StepTraceProps) {
  const rows: Array<{ k: string; v: string; good?: boolean }> = [
    { k: `${formatCentury(centuryOf(trace.year))} anchor`, v: weekdayName(trace.centuryAnchor) },
    { k: `${formatYear(trace.year)} doomsday (Odd+11)`, v: weekdayName(trace.yearDoomsday) },
    {
      k: `${monthName(trace.month)} anchor → the ${ordinal(trace.monthAnchorDay)}`,
      v: weekdayName(trace.monthAnchorWeekday),
    },
    { k: 'Result', v: weekdayName(trace.result), good: true },
  ]
  return (
    <details
      open={defaultOpen}
      style={{ marginTop: 16, borderTop: '1px dashed var(--line)', paddingTop: 10 }}
    >
      <summary style={{ cursor: 'pointer', color: 'var(--muted)', fontWeight: 600, fontSize: 13 }}>
        How it works
      </summary>
      <dl style={{ margin: '8px 0 0' }}>
        {rows.map((r) => (
          <div
            key={r.k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <dt style={{ color: 'var(--muted)', fontSize: 13 }}>{r.k}</dt>
            <dd
              className="serif"
              style={{ margin: 0, fontWeight: 600, color: r.good ? 'var(--green)' : 'var(--ink)' }}
            >
              {r.v}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
