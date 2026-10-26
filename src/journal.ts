import type { CardAction, EntryDraft, EntryId, EntryUpdate, JournalEntry, Theme, ViewState } from './types.js'
import { isCardAction, loadEntries, loadTheme, saveEntries, saveTheme } from './storage.js'
import { EntryForm, announce, applyTheme, getElement, renderEntryList } from './ui.js'

// ── Journal logic ───────────────────────────────────────────────────────
/** Creates a unique id for a new entry. */
function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older browsers / non-secure contexts.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// A listener is any function that wants to hear "the entries changed".
export type StoreListener = (entries: readonly JournalEntry[]) => void

/**
 * CLASS that owns all journal entries.
 * The UI never edits entries directly: it asks the store, and the store saves
 * to localStorage and tells every listener to re-render.
 */
export class JournalStore {
  private entries: JournalEntry[]
  private readonly listeners: StoreListener[] = []

  constructor() {
    this.entries = loadEntries()
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
    return this.entries.find((entry: JournalEntry): boolean => entry.id === id)
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
    this.entries = this.entries.map((entry: JournalEntry): JournalEntry => (entry.id === id ? updated : entry))
    this.commit()
    return updated
  }

  /** Flips the favourite flag. Returns the new value (false if not found). */
  toggleFavorite(id: EntryId): boolean {
    const existing: JournalEntry | undefined = this.getById(id)
    if (!existing) return false

    const favorite: boolean = !existing.favorite
    this.entries = this.entries.map(
      (entry: JournalEntry): JournalEntry => (entry.id === id ? { ...entry, favorite } : entry),
    )
    this.commit()
    return favorite
  }

  /** Returns true if something was deleted. */
  remove(id: EntryId): boolean {
    const before: number = this.entries.length
    this.entries = this.entries.filter((entry: JournalEntry): boolean => entry.id !== id)
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
    saveEntries(this.entries)
    const snapshot: readonly JournalEntry[] = this.getAll()
    this.listeners.forEach((listener: StoreListener): void => listener(snapshot))
  }
}

// ── Setup ───────────────────────────────────────────────────────────────
const store = new JournalStore()
const state: ViewState = { editingId: null }

const listEl: HTMLElement = getElement('#entry-list', HTMLElement)
const countEl: HTMLElement = getElement('#entry-count', HTMLElement)
const themeButton: HTMLButtonElement = getElement('#theme-toggle', HTMLButtonElement)
const form = new EntryForm(getElement('#entry-form', HTMLFormElement), getElement('#form-heading', HTMLElement))

// ── Rendering ───────────────────────────────────────────────────────────
/** Newest first: by entry date, then by when it was written. */
function getVisibleEntries(): JournalEntry[] {
  return [...store.getAll()].sort(
    (a: JournalEntry, b: JournalEntry): number => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  )
}

function render(): void {
  const visible: JournalEntry[] = getVisibleEntries()
  renderEntryList(listEl, visible, store.count)
  countEl.textContent = store.count === 1 ? '1 entry' : `${store.count} entries`
}

function stopEditing(): void {
  state.editingId = null
  form.reset()
}

// ── Events ──────────────────────────────────────────────────────────────
form.onSubmit((draft: EntryDraft): void => {
  if (state.editingId !== null) {
    store.update(state.editingId, draft)
    announce(`Updated “${draft.title}”.`)
  } else {
    store.add(draft)
    announce(`Saved “${draft.title}”.`)
  }
  stopEditing()
})

form.onCancel(stopEditing)

document.addEventListener('keydown', (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && state.editingId !== null) stopEditing()
})

function handleCardAction(action: CardAction, entry: JournalEntry): void {
  switch (action) {
    case 'edit':
      state.editingId = entry.id
      form.startEditing(entry)
      break
    case 'delete':
      if (window.confirm(`Delete “${entry.title}”? This cannot be undone.`)) {
        store.remove(entry.id)
        if (state.editingId === entry.id) stopEditing()
        announce(`Deleted “${entry.title}”.`)
      }
      break
    case 'favorite': {
      const isFavorite: boolean = store.toggleFavorite(entry.id)
      announce(isFavorite ? 'Added to favourites.' : 'Removed from favourites.')
      listEl.querySelector<HTMLButtonElement>(`[data-id="${entry.id}"] [data-action="favorite"]`)?.focus()
      break
    }
  }
}

// One click listener for the whole list ("event delegation"), so newly
// rendered cards work without adding listeners to each button.
listEl.addEventListener('click', (event: MouseEvent): void => {
  if (!(event.target instanceof Element)) return
  const button: HTMLButtonElement | null = event.target.closest<HTMLButtonElement>('button[data-action]')
  const id: string | undefined = button?.closest<HTMLElement>('.entry-card')?.dataset.id
  const action: string | undefined = button?.dataset.action
  const entry: JournalEntry | undefined = id !== undefined ? store.getById(id) : undefined
  if (entry && isCardAction(action)) handleCardAction(action, entry)
})

let theme: Theme = loadTheme()
applyTheme(theme, themeButton)
themeButton.addEventListener('click', (): void => {
  theme = theme === 'dark' ? 'light' : 'dark'
  saveTheme(theme)
  applyTheme(theme, themeButton)
})

store.subscribe(render)
render()
