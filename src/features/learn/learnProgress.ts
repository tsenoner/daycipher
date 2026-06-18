// Thin read shim over the completion signal. `learnCompleted` is written ONLY by
// the mastery gate (R6, `markStageComplete`) — never by a manual "complete" button.
export { getCompleted as getDone } from './learnGate'

export function isDone(id: string, done: string[]): boolean {
  return done.includes(id)
}
