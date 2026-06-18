import type { Attempt } from '../../db/db'
import { practiceAttempts, isLearnAttempt } from '../../db/attempts'
import { CURRICULUM } from '../learn/curriculum'
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
  completed: string[],
  summary: Summary = summarize(practiceAttempts(attempts)),
): Achievement[] {
  const { total, accuracy } = summary
  const practice = practiceAttempts(attempts)
  const fast = practice.filter((a) => a.correct && a.durationMs > 0 && a.durationMs < 3000).length
  return [
    {
      id: 'firstLesson',
      label: 'First Lesson',
      desc: 'Complete your first lesson exercise',
      earned: attempts.some((a) => isLearnAttempt(a) && a.correct),
    },
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
    {
      id: 'internalized',
      label: 'Curriculum Complete',
      desc: 'Internalize all 7 learn stages',
      earned: CURRICULUM.every((s) => completed.includes(s.id)),
    },
  ]
}
