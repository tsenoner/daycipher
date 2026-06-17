/** Zero-padded YYYY-MM-DD for explicit calendar parts (month is 1-12). */
export function ymdKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** Local-timezone YYYY-MM-DD for a timestamp (default: now). */
export function localDayKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  return ymdKey(d.getFullYear(), d.getMonth() + 1, d.getDate())
}
