import type { EntryDraft, EntryId, EntryUpdate, JournalEntry } from '../types/index.js'
import type { TypedStorage } from '../utils/storage.js'
import { createId } from '../utils/id.js'

// A listener is any function that wants to hear "the entries changed".
export type StoreListener = (entries: readonly JournalEntry[]) => void

/**
 * CLASS that owns all journal entries.
 * The UI never edits entries directly: it asks the store, and the store saves
 * to localStorage and tells every listener to re-render.
 */
export class JournalStore {
  private entries: JournalEntry[]
  private readonly storage: TypedStorage<JournalEntry[]>
  private readonly listeners: StoreListener[] = []

  constructor(storage: TypedStorage<JournalEntry[]>) {
    this.storage = storage
    this.entries = storage.load()
  }

  /** A getter: used like a property, `store.count`. */
  get count(): number {
    return this.entries.length
  }

  /** Returns a read-only copy so callers cannot change the store by accident. */
  getAll(): readonly JournalEntry[] {
    return [...this.entries]
  }

  getById(id: EntryId): JournalEntry | undefined {
    return this.entries.find((entry) => entry.id === id)
  }

  add(draft: EntryDraft): JournalEntry {
    const entry: JournalEntry = {
      ...this.clean(draft),
      id: createId(),
      favorite: false,
      createdAt: Date.now(),
    }
    this.entries = [entry, ...this.entries]
    this.commit()
    return entry
  }

  update(id: EntryId, changes: EntryUpdate): JournalEntry | undefined {
    const existing: JournalEntry | undefined = this.getById(id)
    if (!existing) return undefined

    const updated: JournalEntry = {
      ...existing,
      ...this.clean({ ...existing, ...changes }),
      updatedAt: Date.now(),
    }
    this.entries = this.entries.map((entry) => (entry.id === id ? updated : entry))
    this.commit()
    return updated
  }

  /** Flips the favourite flag. Returns the new value (false if not found). */
  toggleFavorite(id: EntryId): boolean {
    const existing: JournalEntry | undefined = this.getById(id)
    if (!existing) return false

    const favorite: boolean = !existing.favorite
    this.entries = this.entries.map((entry) => (entry.id === id ? { ...entry, favorite } : entry))
    this.commit()
    return favorite
  }

  /** Returns true if something was deleted. */
  remove(id: EntryId): boolean {
    const before: number = this.entries.length
    this.entries = this.entries.filter((entry) => entry.id !== id)
    if (this.entries.length === before) return false
    this.commit()
    return true
  }

  /** Registers a listener and returns a function that unregisters it. */
  subscribe(listener: StoreListener): () => void {
    this.listeners.push(listener)
    return (): void => {
      const index: number = this.listeners.indexOf(listener)
      if (index >= 0) this.listeners.splice(index, 1)
    }
  }

  private clean(draft: EntryDraft): EntryDraft {
    return { ...draft, title: draft.title.trim(), content: draft.content.trim() }
  }

  private commit(): void {
    this.storage.save(this.entries)
    const snapshot: readonly JournalEntry[] = this.getAll()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}
