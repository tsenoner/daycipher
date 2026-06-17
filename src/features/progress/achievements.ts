import type { Attempt } from '../../db/db'
import { summarize, type Summary } from './stats'

export interface Achievement {
  id: string
  label: string
  desc: string
  earned: boolean
}

export function achievements(
  attempts: Attempt[],
  longestStreak: number,
  summary: Summary = summarize(attempts),
): Achievement[] {
  const { total, accuracy } = summary
  const fast = attempts.filter((a) => a.correct && a.durationMs > 0 && a.durationMs < 3000).length
  return [
    { id: 'first', label: 'First Steps', desc: 'Solve your first date', earned: total >= 1 },
    { id: 'ten', label: 'Getting Warm', desc: 'Solve 10 dates', earned: total >= 10 },
    { id: 'hundred', label: 'Centurion', desc: 'Solve 100 dates', earned: total >= 100 },
    {
      id: 'streak7',
      label: 'Habit Formed',
      desc: 'Reach a 7-day streak',
      earned: longestStreak >= 7,
    },
    {
      id: 'streak30',
      label: 'Unbreakable',
      desc: 'Reach a 30-day streak',
      earned: longestStreak >= 30,
    },
    {
      id: 'sharp',
      label: 'Sharp',
      desc: '90% accuracy over 20+ solves',
      earned: total >= 20 && accuracy >= 0.9,
    },
    { id: 'speed', label: 'Speed Demon', desc: 'A correct solve under 3s', earned: fast >= 1 },
  ]
}
