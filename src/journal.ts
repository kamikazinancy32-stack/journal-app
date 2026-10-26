import type { CardAction, EntryDraft, EntryFilter, Journal, JournalEntry, Result, Theme, ValidationError, ViewState } from './types.js'
import { isCardAction, isMood, loadEntries, loadTheme, saveEntries, saveTheme } from './storage.js'
import { EntryForm, announce, applyTheme, getElement, renderEntryList, renderMoodFilter } from './ui.js'

// ── Journal logic ───────────────────────────────────────────────────────
/**
 * GENERIC search helper. <T> is "any kind of object in the list", and
 * `key: keyof T` means the key must be a real property of T, so
 * findByProperty(journal, 'titel', ...) is a compile error.
 * Example: findByProperty(journal, 'id', '42') finds the entry with id '42'.
 */
export function findByProperty<T>(list: T[], key: keyof T, value: T[keyof T]): T | undefined {
  return list.find((item: T): boolean => item[key] === value)
}

/**
 * Checks user input. `Partial<JournalEntry>` makes every field optional, so we
 * cannot assume title, content or mood exist: each one is checked here.
 * Returns the cleaned draft, or the list of problems.
 */
export function validateEntry(input: Partial<JournalEntry>): Result<EntryDraft> {
  const title: string = input.title?.trim() ?? ''
  const content: string = input.content?.trim() ?? ''
  const mood: unknown = input.mood // re-checked at runtime: it came from the page

  const errors: ValidationError[] = []
  if (title === '') errors.push({ field: 'title', message: 'Give your entry a title.' })
  if (content === '') errors.push({ field: 'content', message: 'Write something before saving.' })
  if (!isMood(mood)) errors.push({ field: 'mood', message: 'Pick a mood from the list.' })

  // After this line TypeScript knows `mood` is a Mood (the type guard narrowed it).
  if (errors.length > 0 || !isMood(mood)) return { ok: false, errors }
  return { ok: true, value: { title, content, mood } }
}

/**
 * Keeps the entries that match the chosen mood AND contain the search text
 * in their title or content (not case-sensitive). Returns a new Journal.
 */
export function filterEntries(journal: Journal, filter: EntryFilter): Journal {
  const search: string = filter.search.trim().toLowerCase()
  return journal.filter((entry: JournalEntry): boolean => {
    const moodMatches: boolean = filter.mood === 'all' || entry.mood === filter.mood
    const textMatches: boolean =
      search === '' || entry.title.toLowerCase().includes(search) || entry.content.toLowerCase().includes(search)
    return moodMatches && textMatches
  })
}

// A listener is any function that wants to hear "the entries changed".
export type StoreListener = (journal: Journal) => void

/**
 * CLASS that owns all journal entries.
 * The UI never edits entries directly: it asks the store, and the store saves
 * to localStorage and tells every listener to re-render.
 */
export class JournalStore {
  private entries: Journal
  private readonly listeners: StoreListener[] = []

  constructor() {
    this.entries = loadEntries()
  }

  /** A getter: used like a property, `store.count`. */
  get count(): number {
    return this.entries.length
  }

  /** Returns a copy so callers cannot change the store by accident. */
  getAll(): Journal {
    return [...this.entries]
  }

  /** Validates the input, then builds a complete entry (id + timestamp) and saves it. */
  addEntry(input: Partial<JournalEntry>): Result<JournalEntry> {
    const draft: Result<EntryDraft> = validateEntry(input)
    if (!draft.ok) return draft

    const entry: JournalEntry = { ...draft.value, id: crypto.randomUUID(), timestamp: Date.now() }
    this.entries = [entry, ...this.entries]
    this.commit()
    return { ok: true, value: entry }
  }

  /** Applies changes to an existing entry. id and timestamp never change. */
  editEntry(id: string, changes: Partial<JournalEntry>): Result<JournalEntry> {
    const existing: JournalEntry | undefined = findByProperty(this.entries, 'id', id)
    if (!existing) return { ok: false, errors: [{ message: 'That entry no longer exists.' }] }

    const draft: Result<EntryDraft> = validateEntry({ ...existing, ...changes })
    if (!draft.ok) return draft

    const updated: JournalEntry = { ...existing, ...draft.value }
    this.entries = this.entries.map((entry: JournalEntry): JournalEntry => (entry.id === id ? updated : entry))
    this.commit()
    return { ok: true, value: updated }
  }

  /** Returns true if something was deleted. */
  deleteEntry(id: string): boolean {
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

  private commit(): void {
    saveEntries(this.entries)
    const snapshot: Journal = this.getAll()
    this.listeners.forEach((listener: StoreListener): void => listener(snapshot))
  }
}

// ── Setup ───────────────────────────────────────────────────────────────
const store = new JournalStore()
const state: ViewState = { editingId: null, filter: { mood: 'all', search: '' } }

const listEl: HTMLElement = getElement('#entry-list', HTMLElement)
const countEl: HTMLElement = getElement('#entry-count', HTMLElement)
const themeButton: HTMLButtonElement = getElement('#theme-toggle', HTMLButtonElement)
const searchInput: HTMLInputElement = getElement('#filter-search', HTMLInputElement)
const moodFilter: HTMLSelectElement = getElement('#filter-mood', HTMLSelectElement)
const form = new EntryForm(getElement('#entry-form', HTMLFormElement), getElement('#form-heading', HTMLElement))

// ── Rendering ───────────────────────────────────────────────────────────
/** The entries that match the filters, newest first. */
function getVisibleEntries(): Journal {
  return filterEntries(store.getAll(), state.filter).sort(
    (a: JournalEntry, b: JournalEntry): number => b.timestamp - a.timestamp,
  )
}

function render(): void {
  const visible: Journal = getVisibleEntries()
  renderEntryList(listEl, visible, store.count)
  const total: string = store.count === 1 ? '1 entry' : `${store.count} entries`
  countEl.textContent = visible.length === store.count ? total : `${visible.length} of ${total}`
}

function stopEditing(): void {
  state.editingId = null
  form.reset()
}

// ── Events ──────────────────────────────────────────────────────────────
form.onSubmit((input: Partial<JournalEntry>): void => {
  const isEditing: boolean = state.editingId !== null
  const result: Result<JournalEntry> =
    state.editingId !== null ? store.editEntry(state.editingId, input) : store.addEntry(input)

  if (!result.ok) {
    form.showErrors(result.errors)
    return
  }
  announce(`${isEditing ? 'Updated' : 'Saved'} “${result.value.title}”.`)
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
        store.deleteEntry(entry.id)
        if (state.editingId === entry.id) stopEditing()
        announce(`Deleted “${entry.title}”.`)
      }
      break
  }
}

// One click listener for the whole list ("event delegation"), so newly
// rendered cards work without adding listeners to each button.
listEl.addEventListener('click', (event: MouseEvent): void => {
  if (!(event.target instanceof Element)) return
  const button: HTMLButtonElement | null = event.target.closest<HTMLButtonElement>('button[data-action]')
  const id: string | undefined = button?.closest<HTMLElement>('.entry-card')?.dataset.id
  const action: string | undefined = button?.dataset.action
  const entry: JournalEntry | undefined = id !== undefined ? findByProperty(store.getAll(), 'id', id) : undefined
  if (entry && isCardAction(action)) handleCardAction(action, entry)
})

// Filters: re-render on every keystroke / change. The select's value is a plain
// string, so the isMood type guard turns it back into a Mood (or 'all').
renderMoodFilter(moodFilter)
searchInput.addEventListener('input', (): void => {
  state.filter.search = searchInput.value
  render()
})
moodFilter.addEventListener('change', (): void => {
  const value: string = moodFilter.value
  state.filter.mood = isMood(value) ? value : 'all'
  render()
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
