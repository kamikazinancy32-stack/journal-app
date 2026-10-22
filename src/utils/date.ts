const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Today's date in the user's local time zone, as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  const year: number = now.getFullYear()
  const month: string = String(now.getMonth() + 1).padStart(2, '0')
  const day: string = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isISODate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(parseISODate(value).getTime())
}

/** "2026-10-22" → a Date at local midnight (avoids UTC off-by-one-day bugs). */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** "2026-10-22" → "Thu, 22 Oct 2026" (in the user's own locale format). */
export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
