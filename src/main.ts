import type { CardAction, EntryDraft, JournalEntry, ViewState } from './types/index.js'
import { JournalStore } from './services/journalStore.js'
import { TypedStorage } from './utils/storage.js'
import { isArrayOf, isCardAction, isJournalEntry } from './utils/guards.js'
import { getElement } from './utils/dom.js'
import { EntryForm } from './ui/entryForm.js'
import { renderEntryList } from './ui/entryList.js'
import { announce } from './ui/announce.js'
import { initThemeToggle } from './ui/theme.js'

// ── Setup ───────────────────────────────────────────────────────────────
const ENTRIES_KEY = 'journal:entries'

const store = new JournalStore(new TypedStorage<JournalEntry[]>(ENTRIES_KEY, isArrayOf(isJournalEntry), []))
const state: ViewState = { editingId: null }

const listEl: HTMLElement = getElement('#entry-list', HTMLElement)
const countEl: HTMLElement = getElement('#entry-count', HTMLElement)
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

initThemeToggle(getElement('#theme-toggle', HTMLButtonElement))
store.subscribe(render)
render()
