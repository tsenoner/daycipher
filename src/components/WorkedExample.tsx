import { useState } from 'react'
import type { Block } from '../features/learn/curriculum'
import {
  generateWorkedExample,
  WORKED_STAGES,
  type GeneratedExample,
  type WorkedStage,
} from '../features/learn/workedExample'

type Hero = Extract<Block, { kind: 'example' }>

function Card({ date, steps, answer }: { date: string; steps: string[]; answer: string }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: 14,
        margin: '12px 0',
      }}
    >
      <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>
        {date}
      </div>
      <ol style={{ lineHeight: 1.7, paddingLeft: 20, marginTop: 8 }}>
        {steps.map((s, j) => (
          <li key={j}>{s}</li>
        ))}
      </ol>
      <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--green)' }}>→ {answer}</div>
    </div>
  )
}

export function WorkedExample({
  stageId,
  hero,
  rng = Math.random,
}: {
  stageId: string
  hero: Hero
  rng?: () => number
}) {
  const supported = (WORKED_STAGES as readonly string[]).includes(stageId)
  const [extra, setExtra] = useState<GeneratedExample | null>(null)

  const shown = extra ?? hero
  return (
    <div>
      <Card date={shown.date} steps={shown.steps} answer={shown.answer} />
      {supported && (
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            type="button"
            onClick={() => setExtra(generateWorkedExample(stageId as WorkedStage, rng))}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              color: 'var(--burg)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Show another →
          </button>
          {extra && (
            <button
              type="button"
              onClick={() => setExtra(null)}
              style={{ background: 'none', border: 0, padding: 0, color: 'var(--muted)', cursor: 'pointer' }}
            >
              Back to the lesson example
            </button>
          )}
        </div>
      )}
    </div>
  )
}
