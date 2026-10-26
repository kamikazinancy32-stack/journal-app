import type { JournalEntry } from '../types/index.js'
import { renderEntryCard } from './entryCard.js'

/**
 * Renders the visible entries.
 * `totalCount` is how many entries exist in total, so we can tell the
 * difference between "journal is empty" and "nothing is visible right now".
 */
export function renderEntryList(container: HTMLElement, entries: readonly JournalEntry[], totalCount: number): void {
  if (totalCount === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Nothing written yet.</p>
        <p class="empty-state__text">Your first entry will appear here. Start with a single sentence about today.</p>
      </div>`
    return
  }

  if (entries.length === 0) {
    container.innerHTML = `<p class="no-results">No entries to show.</p>`
    return
  }

  container.innerHTML = entries.map((entry: JournalEntry, index: number): string => renderEntryCard(entry, index)).join('')
}
