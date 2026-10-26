import type { EntryDraft, JournalEntry } from '../types/index.js'
import { getElement } from '../utils/dom.js'
import { isISODate, todayISO } from '../utils/date.js'
import { MOOD_OPTIONS, isMood } from '../utils/moods.js'

export type SubmitHandler = (draft: EntryDraft) => void

/** CLASS that wraps the entry form: reading, validating, filling and resetting it. */
export class EntryForm {
  private readonly form: HTMLFormElement
  private readonly heading: HTMLElement
  private readonly titleInput: HTMLInputElement
  private readonly dateInput: HTMLInputElement
  private readonly moodSelect: HTMLSelectElement
  private readonly contentInput: HTMLTextAreaElement
  private readonly submitButton: HTMLButtonElement
  private readonly cancelButton: HTMLButtonElement
  private readonly errorText: HTMLElement

  constructor(form: HTMLFormElement, heading: HTMLElement) {
    this.form = form
    this.heading = heading
    this.titleInput = getElement('#entry-title', HTMLInputElement, form)
    this.dateInput = getElement('#entry-date', HTMLInputElement, form)
    this.moodSelect = getElement('#entry-mood', HTMLSelectElement, form)
    this.contentInput = getElement('#entry-content', HTMLTextAreaElement, form)
    this.submitButton = getElement('#entry-submit', HTMLButtonElement, form)
    this.cancelButton = getElement('#entry-cancel', HTMLButtonElement, form)
    this.errorText = getElement('#form-error', HTMLElement, form)

    this.renderMoodOptions()
    this.reset()
  }

  onSubmit(handler: SubmitHandler): void {
    this.form.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault()
      const draft: EntryDraft | null = this.read()
      if (draft) handler(draft)
    })
  }

  onCancel(handler: () => void): void {
    this.cancelButton.addEventListener('click', handler)
  }

  /** Puts an existing entry into the form so it can be edited. */
  startEditing(entry: JournalEntry): void {
    this.clearErrors()
    this.titleInput.value = entry.title
    this.dateInput.value = entry.date
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
    this.dateInput.value = todayISO()
    this.dateInput.max = todayISO()
    this.heading.textContent = 'New entry'
    this.submitButton.textContent = 'Save entry'
    this.cancelButton.hidden = true
    this.form.classList.remove('is-editing')
  }

  /** Validates the inputs. Returns a draft, or null (and shows errors) if invalid. */
  private read(): EntryDraft | null {
    this.clearErrors()
    const title: string = this.titleInput.value.trim()
    const content: string = this.contentInput.value.trim()
    const date: string = this.dateInput.value
    const mood: string = this.moodSelect.value

    const problems: string[] = []
    if (title === '') problems.push(this.flag(this.titleInput, 'Give your entry a title.'))
    if (!isISODate(date)) problems.push(this.flag(this.dateInput, 'Pick a valid date.'))
    else if (date > todayISO()) problems.push(this.flag(this.dateInput, 'The date cannot be in the future.'))
    if (content === '') problems.push(this.flag(this.contentInput, 'Write something before saving.'))

    if (problems.length > 0 || !isMood(mood)) {
      this.errorText.textContent = problems.join(' ')
      this.errorText.hidden = false
      this.form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return null
    }
    return { title, content, date, mood }
  }

  private flag(input: HTMLElement, message: string): string {
    input.setAttribute('aria-invalid', 'true')
    input.setAttribute('aria-describedby', 'form-error')
    return message
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
      (option) => `<option value="${option.value}">${option.label}</option>`,
    ).join('')
  }
}
