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
function keyOf(dt: Date): string {
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${m}-${d}`
}

/** weeks = columns of 7 (Sun..Sat), oldest -> newest, windowed to the last `weeks` weeks ending this week. */
export function buildHeatmap(
  countByDay: Record<string, number>,
  todayKey: string,
  weeks = 18,
): HeatModel {
  const today = parseKey(todayKey)
  const end = new Date(today)
  end.setDate(today.getDate() + (6 - today.getDay())) // Saturday of this week
  const totalDays = weeks * 7
  const start = new Date(end)
  start.setDate(end.getDate() - (totalDays - 1)) // Sunday

  const cells: HeatCell[] = []
  let maxCount = 0
  for (let i = 0; i < totalDays; i++) {
    const dt = new Date(start)
    dt.setDate(start.getDate() + i)
    const date = keyOf(dt)
    const count = countByDay[date] ?? 0
    if (count > maxCount) maxCount = count
    cells.push({ date, count, level: 0, weekday: dt.getDay() })
  }
  for (const c of cells) c.level = bucket(c.count, maxCount)
  const weeksArr: HeatCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeksArr.push(cells.slice(i, i + 7))
  return { weeks: weeksArr, maxCount }
}
