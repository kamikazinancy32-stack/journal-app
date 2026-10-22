import type { JournalEntry } from '../types'
import { formatDate } from '../utils/date'
import { escapeHtml } from '../utils/dom'
import { getMoodLabel } from '../utils/moods'

/** Builds the HTML for ONE entry card. Shared by every list on the page. */
export function renderEntryCard(entry: JournalEntry, index: number): string {
  const title: string = escapeHtml(entry.title)
  const edited: string = entry.updatedAt !== undefined ? '<span class="entry-card__edited">Edited</span>' : ''
  const favoriteLabel: string = entry.favorite ? `Remove ${title} from favourites` : `Add ${title} to favourites`

  return `
    <article class="entry-card" data-id="${escapeHtml(entry.id)}" data-mood="${entry.mood}" style="--i: ${index}">
      <header class="entry-card__header">
        <time class="entry-card__date" datetime="${entry.date}">${formatDate(entry.date)}</time>
        <span class="entry-card__mood">${getMoodLabel(entry.mood)}</span>
      </header>
      <h3 class="entry-card__title">${title}</h3>
      <p class="entry-card__content">${escapeHtml(entry.content)}</p>
      <footer class="entry-card__footer">
        ${edited}
        <div class="entry-card__actions">
          <button class="text-btn text-btn--favorite" type="button" data-action="favorite"
            aria-pressed="${entry.favorite}" aria-label="${favoriteLabel}">${entry.favorite ? '★' : '☆'}</button>
          <button class="text-btn" type="button" data-action="edit" aria-label="Edit ${title}">Edit</button>
          <button class="text-btn text-btn--danger" type="button" data-action="delete" aria-label="Delete ${title}">Delete</button>
        </div>
      </footer>
    </article>`
}
