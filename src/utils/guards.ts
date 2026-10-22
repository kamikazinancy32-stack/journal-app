import type { CardAction, JournalEntry, Theme } from '../types'
import { isMood } from './moods'

// Type guards turn `unknown` data (from JSON or the DOM) into trusted types.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function isCardAction(value: unknown): value is CardAction {
  return value === 'edit' || value === 'delete' || value === 'favorite'
}

export function isJournalEntry(value: unknown): value is JournalEntry {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.content) &&
    isString(value.date) &&
    isMood(value.mood) &&
    typeof value.favorite === 'boolean' &&
    isNumber(value.createdAt) &&
    (value.updatedAt === undefined || isNumber(value.updatedAt))
  )
}

/**
 * GENERIC guard factory: give it a guard for one item (T) and it returns a
 * guard for an array of those items (T[]).
 * Example: isArrayOf(isJournalEntry) checks a JournalEntry[].
 */
export function isArrayOf<T>(itemGuard: (value: unknown) => value is T): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] => Array.isArray(value) && value.every(itemGuard)
}
