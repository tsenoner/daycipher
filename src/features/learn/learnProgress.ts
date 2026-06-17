import { getMeta, setMeta } from '../../db/meta'

export async function getDone(): Promise<string[]> {
  return getMeta<string[]>('learnDone', [])
}

export async function markDone(id: string): Promise<string[]> {
  const done = await getDone()
  if (done.includes(id)) return done
  const next = [...done, id]
  await setMeta('learnDone', next)
  return next
}

export function isDone(id: string, done: string[]): boolean {
  return done.includes(id)
}
