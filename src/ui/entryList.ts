import type { JournalEntry } from '../types'
import { renderEntryCard } from './entryCard'
import { SPIRAL_SVG } from './motifs'

/**
 * Renders the visible entries.
 * `totalCount` is how many entries exist in total, so we can tell the
 * difference between "journal is empty" and "nothing is visible right now".
 */
export function renderEntryList(container: HTMLElement, entries: readonly JournalEntry[], totalCount: number): void {
  if (totalCount === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${SPIRAL_SVG}
        <h3 class="empty-state__title">Your journal is waiting</h3>
        <p class="empty-state__text">Every pattern starts with one line. Write your first entry using the form.</p>
      </div>`
    return
  }

  if (entries.length === 0) {
    container.innerHTML = `<p class="no-results">No entries to show.</p>`
    return
  }

  container.innerHTML = entries.map((entry: JournalEntry, index: number): string => renderEntryCard(entry, index)).join('')
}
