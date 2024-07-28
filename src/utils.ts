import { Effect, Number } from 'effect'
import type { CalendarDate } from './schemas'

export const paginatedArray = <T, E, R>(array: Effect.Effect<T[], E, R>) =>
  (options: { pageSize: number, pageNo: number }) => Effect.gen(function*() {
    const pageSize = Number.clamp(options.pageSize, { minimum: 1, maximum: Infinity })
    const pageNo = Number.clamp(options.pageNo, { minimum: 1, maximum: Infinity })

    const data = yield* array
    const page = data.slice((pageNo - 1) * pageSize, pageNo * pageSize)
    return { page, total: data.length }
  })

export function dateToCalendarDate(date: Date): typeof CalendarDate.Type {
  return date.toISOString().slice(0, 'YYYY-MM-DD'.length)
}
