import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStage } from './curriculum'
import { LessonBlocks } from '../../components/LessonBlocks'
import { getDone, markDone, isDone } from './learnProgress'

export function LessonScreen() {
  const { stageId } = useParams()
  const stage = stageId ? getStage(stageId) : undefined
  const [done, setDone] = useState<string[]>([])

  useEffect(() => {
    let active = true
    void getDone().then((d) => {
      if (active) setDone(d)
    })
    return () => {
      active = false
    }
  }, [])

  if (!stage) {
    return (
      <div className="screen">
        <p>Lesson not found.</p>
        <Link to="/learn" style={{ color: 'var(--burg)' }}>
          ← Learn
        </Link>
      </div>
    )
  }

  const completed = isDone(stage.id, done)
  return (
    <div className="screen">
      <Link to="/learn" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
        ← Learn
      </Link>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Stage {stage.n}
      </div>
      <h1 style={{ marginTop: 2 }}>{stage.title}</h1>
      <p className="muted">{stage.goal}</p>
      <LessonBlocks blocks={stage.blocks} />
      <button
        type="button"
        disabled={completed}
        onClick={() => {
          void markDone(stage.id).then(setDone)
        }}
        style={{
          marginTop: 16,
          width: '100%',
          minHeight: 'var(--tap)',
          borderRadius: 12,
          border: completed ? '1px solid var(--line)' : 0,
          background: completed ? 'var(--card)' : 'var(--green)',
          color: completed ? 'var(--muted)' : '#fff',
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {completed ? '✓ Completed' : 'Mark complete'}
      </button>
      <Link
        to="/practice"
        style={{
          display: 'block',
          textAlign: 'center',
          marginTop: 12,
          color: 'var(--burg)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Practice this →
      </Link>
    </div>
  )
}
