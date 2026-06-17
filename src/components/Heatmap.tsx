import type { HeatModel } from '../features/progress/heatmap'

interface HeatmapProps {
  model: HeatModel
  cell?: number
  gap?: number
}

export function Heatmap({ model, cell = 13, gap = 3 }: HeatmapProps) {
  const rows = [0, 1, 2, 3, 4, 5, 6]
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: gap }}>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              {model.weeks.map((week, ci) => {
                const c = week[row]
                if (!c) return <td key={ci} style={{ padding: 0 }} />
                const label =
                  c.count > 0
                    ? `${c.count} ${c.count === 1 ? 'problem' : 'problems'} on ${c.date}`
                    : `No practice on ${c.date}`
                return (
                  <td key={ci} style={{ padding: 0 }}>
                    <span
                      role="img"
                      aria-label={label}
                      title={label}
                      style={{
                        display: 'block',
                        width: cell,
                        height: cell,
                        borderRadius: 3,
                        background: `var(--hm-${c.level})`,
                      }}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 8,
          fontSize: 11,
          color: 'var(--muted)',
        }}
      >
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            aria-hidden="true"
            style={{
              width: cell,
              height: cell,
              borderRadius: 3,
              background: `var(--hm-${l})`,
              display: 'inline-block',
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
