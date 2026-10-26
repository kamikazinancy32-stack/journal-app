import { Mood } from './types.js'
import type { CardAction, Journal, JournalEntry, Theme } from './types.js'

// ── Type guards ─────────────────────────────────────────────────────────
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

// If this returns true, TypeScript knows `value` is a Mood.
export function isMood(value: unknown): value is Mood {
  return Object.values(Mood).some((mood: Mood): boolean => mood === value)
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function isCardAction(value: unknown): value is CardAction {
  return value === 'edit' || value === 'delete'
}

export function isJournalEntry(value: unknown): value is JournalEntry {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.content) &&
    isMood(value.mood) &&
    isNumber(value.timestamp)
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

// ── Generic storage ─────────────────────────────────────────────────────
// A Validator<T> is a type guard: it checks `unknown` data and, if it returns
// true, TypeScript treats the value as type T from then on.
export type Validator<T> = (value: unknown) => value is T

/**
 * GENERIC wrapper around localStorage.
 *
 * <T> is a placeholder for "the type of data stored under this key". The same
 * class works for entries (TypedStorage<Journal>) and for the theme
 * (TypedStorage<Theme>), and each copy is fully type-checked.
 *
 * It is not called `Storage` because the browser already has a built-in type
 * with that name (window.localStorage is a `Storage`).
 */
export class TypedStorage<T> {
  private readonly key: string
  private readonly validate: Validator<T>
  private readonly fallback: T

  constructor(key: string, validate: Validator<T>, fallback: T) {
    this.key = key
    this.validate = validate
    this.fallback = fallback
  }

  /** Reads and checks the saved value. Returns the fallback if it is missing or broken. */
  load(): T {
    try {
      const raw: string | null = localStorage.getItem(this.key)
      if (raw === null) return this.fallback

      // JSON.parse could return anything, so we store it as `unknown` (never `any`)
      // and only trust it after the validator has checked it.
      const parsed: unknown = JSON.parse(raw)
      return this.validate(parsed) ? parsed : this.fallback
    } catch {
      return this.fallback
    }
  }

  /** Saves the value. Returns false if the browser refused (e.g. storage full). */
  save(value: T): boolean {
    try {
      localStorage.setItem(this.key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }

  clear(): void {
    localStorage.removeItem(this.key)
  }
}

// ── Journal and theme storage ───────────────────────────────────────────
const entryStorage = new TypedStorage<Journal>('journal:entries', isArrayOf(isJournalEntry), [])

const prefersDark: boolean = window.matchMedia('(prefers-color-scheme: dark)').matches
const themeStorage = new TypedStorage<Theme>('journal:theme', isTheme, prefersDark ? 'dark' : 'light')

/** Loads the saved entries, or an empty list if there are none or they are broken. */
export function loadEntries(): Journal {
  return entryStorage.load()
}

export function saveEntries(journal: Journal): boolean {
  return entryStorage.save(journal)
}

/** Loads the saved theme, or the system preference if none was saved. */
export function loadTheme(): Theme {
  return themeStorage.load()
}

export function saveTheme(theme: Theme): boolean {
  return themeStorage.save(theme)
}
