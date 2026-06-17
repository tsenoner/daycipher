import { ymdKey } from '../../lib/datekey'

export interface HeatCell {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
  weekday: number
}
export interface HeatModel {
  weeks: HeatCell[][]
  maxCount: number
}

export function bucket(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4
}

function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * weeks = columns of 7, oldest -> newest, windowed to the last `weeks` weeks
 * ending this week. Each column starts on `weekStart` (0 = Sunday, 1 = Monday),
 * matching the weekday picker order used elsewhere.
 */
export function buildHeatmap(
  countByDay: Record<string, number>,
  todayKey: string,
  weeks = 18,
  weekStart: 0 | 1 = 0,
): HeatModel {
  const today = parseKey(todayKey)
  const offsetInWeek = (today.getDay() - weekStart + 7) % 7
  const end = new Date(today)
  end.setDate(today.getDate() + (6 - offsetInWeek)) // last day of this week
  const totalDays = weeks * 7
  const start = new Date(end)
  start.setDate(end.getDate() - (totalDays - 1)) // first day (weekStart) of the window

  const cells: HeatCell[] = []
  let maxCount = 0
  for (let i = 0; i < totalDays; i++) {
    const dt = new Date(start)
    dt.setDate(start.getDate() + i)
    const date = ymdKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
    const count = countByDay[date] ?? 0
    if (count > maxCount) maxCount = count
    cells.push({ date, count, level: 0, weekday: dt.getDay() })
  }
  for (const c of cells) c.level = bucket(c.count, maxCount)
  const weeksArr: HeatCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeksArr.push(cells.slice(i, i + 7))
  return { weeks: weeksArr, maxCount }
}
