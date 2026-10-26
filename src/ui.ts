import { Mood } from './types.js'
import type { EntryDraft, Journal, JournalEntry, MoodOption, Theme, ValidationError } from './types.js'
import { isMood } from './storage.js'

// ── DOM helpers ─────────────────────────────────────────────────────────
/**
 * GENERIC element lookup with a constraint: T must be some kind of Element.
 * getElement('#entry-form', HTMLFormElement) returns an HTMLFormElement, so we
 * get autocomplete for .reset(), .elements, etc. without any casting.
 */
export function getElement<T extends Element>(
  selector: string,
  type: { new (): T; prototype: T },
  root: ParentNode = document,
): T {
  // querySelector<T> tells TypeScript what we expect; the instanceof check
  // makes sure it is really there (not null) and really that kind of element.
  const element: T | null = root.querySelector<T>(selector)
  if (!(element instanceof type)) {
    throw new Error(`Expected ${selector} to exist and be a ${type.name}`)
  }
  return element
}

/** Makes user text safe to put inside innerHTML (prevents HTML injection). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Dates ───────────────────────────────────────────────────────────────
/** A timestamp → "Mon, 26 Oct 2026, 14:05" (in the user's own locale format). */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** A timestamp → "2026-10-26T14:05:00.000Z", the machine-readable form for <time datetime>. */
function toISO(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

// ── Moods ───────────────────────────────────────────────────────────────
// `Record<Mood, string>`: an object with exactly one label per Mood member.
// Adding a new mood to the enum without a label here is a compile error.
const MOOD_LABELS: Readonly<Record<Mood, string>> = {
  [Mood.HAPPY]: 'Happy',
  [Mood.SAD]: 'Sad',
  [Mood.MOTIVATED]: 'Motivated',
  [Mood.STRESSED]: 'Stressed',
  [Mood.CALM]: 'Calm',
}

// `readonly` array: the list of moods can be read but never changed at runtime.
export const MOOD_OPTIONS: readonly MoodOption[] = Object.values(Mood).map(
  (mood: Mood): MoodOption => ({ value: mood, label: MOOD_LABELS[mood] }),
)

export function getMoodLabel(mood: Mood): string {
  return MOOD_LABELS[mood]
}

/** Fills the mood filter: "All moods" first, then one option per Mood. */
export function renderMoodFilter(select: HTMLSelectElement): void {
  const options: string[] = MOOD_OPTIONS.map(
    (option: MoodOption): string => `<option value="${option.value}">${option.label}</option>`,
  )
  select.innerHTML = ['<option value="all">All moods</option>', ...options].join('')
}

// ── Screen-reader announcements ─────────────────────────────────────────
/** Reads a short message aloud for screen-reader users (via an aria-live region). */
export function announce(message: string): void {
  const region: HTMLElement | null = document.getElementById('announcer')
  if (!region) return
  region.textContent = ''
  // A tiny delay makes screen readers notice the change even for repeated messages.
  window.setTimeout((): void => {
    region.textContent = message
  }, 50)
}

// ── Theme ───────────────────────────────────────────────────────────────
/** Applies a theme to the page and updates the toggle button to offer the other one. */
export function applyTheme(theme: Theme, button: HTMLButtonElement): void {
  document.documentElement.dataset.theme = theme
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  button.textContent = next === 'dark' ? 'Dark' : 'Light'
  button.setAttribute('aria-label', `Switch to ${next} mode`)
  button.setAttribute('aria-pressed', String(theme === 'dark'))
}

// ── Entry cards and list ────────────────────────────────────────────────
/** Builds the HTML for ONE entry card. */
export function renderEntryCard(entry: JournalEntry, index: number): string {
  const title: string = escapeHtml(entry.title)

  return `
    <article class="entry-card" data-id="${escapeHtml(entry.id)}" data-mood="${entry.mood}" style="--i: ${index}">
      <header class="entry-card__header">
        <time class="entry-card__date" datetime="${toISO(entry.timestamp)}">${formatDate(entry.timestamp)}</time>
        <span class="entry-card__mood">${getMoodLabel(entry.mood)}</span>
      </header>
      <h3 class="entry-card__title">${title}</h3>
      <p class="entry-card__content">${escapeHtml(entry.content)}</p>
      <footer class="entry-card__footer">
        <div class="entry-card__actions">
          <button class="text-btn" type="button" data-action="edit" aria-label="Edit ${title}">Edit</button>
          <button class="text-btn text-btn--danger" type="button" data-action="delete" aria-label="Delete ${title}">Delete</button>
        </div>
      </footer>
    </article>`
}

/**
 * Renders the visible entries.
 * `totalCount` is how many entries exist in total, so we can tell the
 * difference between "journal is empty" and "nothing is visible right now".
 */
export function renderEntryList(container: HTMLElement, entries: Journal, totalCount: number): void {
  if (totalCount === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Nothing written yet.</p>
        <p class="empty-state__text">Your first entry will appear here. Start with a single sentence about today.</p>
      </div>`
    return
  }

  if (entries.length === 0) {
    container.innerHTML = `<p class="no-results">No entries match your filters.</p>`
    return
  }

  container.innerHTML = entries.map((entry: JournalEntry, index: number): string => renderEntryCard(entry, index)).join('')
}

// ── Entry form ──────────────────────────────────────────────────────────
export type SubmitHandler = (input: Partial<JournalEntry>) => void

/** CLASS that wraps the entry form: reading, filling, resetting it and showing errors. */
export class EntryForm {
  private readonly form: HTMLFormElement
  private readonly heading: HTMLElement
  private readonly titleInput: HTMLInputElement
  private readonly moodSelect: HTMLSelectElement
  private readonly contentInput: HTMLTextAreaElement
  private readonly submitButton: HTMLButtonElement
  private readonly cancelButton: HTMLButtonElement
  private readonly errorText: HTMLElement
  // `Record<keyof EntryDraft, HTMLElement>`: exactly one input per editable field.
  private readonly fields: Record<keyof EntryDraft, HTMLElement>

  constructor(form: HTMLFormElement, heading: HTMLElement) {
    this.form = form
    this.heading = heading
    this.titleInput = getElement('#entry-title', HTMLInputElement, form)
    this.moodSelect = getElement('#entry-mood', HTMLSelectElement, form)
    this.contentInput = getElement('#entry-content', HTMLTextAreaElement, form)
    this.submitButton = getElement('#entry-submit', HTMLButtonElement, form)
    this.cancelButton = getElement('#entry-cancel', HTMLButtonElement, form)
    this.errorText = getElement('#form-error', HTMLElement, form)
    this.fields = { title: this.titleInput, content: this.contentInput, mood: this.moodSelect }

    this.renderMoodOptions()
    this.reset()
  }

  onSubmit(handler: SubmitHandler): void {
    this.form.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault()
      this.clearErrors()
      handler(this.read())
    })
  }

  onCancel(handler: () => void): void {
    this.cancelButton.addEventListener('click', handler)
  }

  /** Puts an existing entry into the form so it can be edited. */
  startEditing(entry: JournalEntry): void {
    this.clearErrors()
    this.titleInput.value = entry.title
    this.moodSelect.value = entry.mood
    this.contentInput.value = entry.content
    this.heading.textContent = 'Edit entry'
    this.submitButton.textContent = 'Update entry'
    this.cancelButton.hidden = false
    this.form.classList.add('is-editing')
    this.titleInput.focus()
  }

  /** Clears the form back to "new entry" mode. */
  reset(): void {
    this.form.reset()
    this.clearErrors()
    this.heading.textContent = 'New entry'
    this.submitButton.textContent = 'Save entry'
    this.cancelButton.hidden = true
    this.form.classList.remove('is-editing')
  }

  /** Marks the invalid fields, shows the messages and moves focus to the first problem. */
  showErrors(errors: ValidationError[]): void {
    this.clearErrors()
    errors.forEach((error: ValidationError): void => {
      if (error.field === undefined) return
      this.fields[error.field].setAttribute('aria-invalid', 'true')
      this.fields[error.field].setAttribute('aria-describedby', 'form-error')
    })
    this.errorText.textContent = errors.map((error: ValidationError): string => error.message).join(' ')
    this.errorText.hidden = false
    this.form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }

  /**
   * Reads the raw input. The result is Partial because nothing is checked here:
   * journal.ts validates it. The mood is only included if it is a real Mood.
   */
  private read(): Partial<JournalEntry> {
    const mood: string = this.moodSelect.value
    return {
      title: this.titleInput.value,
      content: this.contentInput.value,
      mood: isMood(mood) ? mood : undefined,
    }
  }

  private clearErrors(): void {
    this.errorText.hidden = true
    this.errorText.textContent = ''
    this.form.querySelectorAll('[aria-invalid]').forEach((input: Element): void => {
      input.removeAttribute('aria-invalid')
      input.removeAttribute('aria-describedby')
    })
  }

  private renderMoodOptions(): void {
    this.moodSelect.innerHTML = MOOD_OPTIONS.map(
      (option: MoodOption): string => `<option value="${option.value}">${option.label}</option>`,
    ).join('')
  }
}
