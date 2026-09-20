import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(advancedFormat)
dayjs.extend(relativeTime)

/** "2 minutes ago" — at-a-glance recency for the board list. */
export function formatRelativeTime(value: number | string | Date): string {
  return dayjs(value).fromNow()
}

/** "20th September 2026" — the formal decision-approval date, used identically everywhere it's
 * shown (the live board, the signed read-only view, the export). */
export function formatApprovalDate(value: number | string | Date): string {
  return dayjs(value).format('Do MMMM YYYY')
}
