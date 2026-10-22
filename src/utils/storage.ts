// A Validator<T> is a type guard: it checks `unknown` data and, if it returns
// true, TypeScript treats the value as type T from then on.
export type Validator<T> = (value: unknown) => value is T

/**
 * GENERIC wrapper around localStorage.
 *
 * <T> is a placeholder for "the type of data stored under this key". The same
 * class works for entries (TypedStorage<JournalEntry[]>) and for the theme
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
