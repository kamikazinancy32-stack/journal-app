import type { JournalEntry } from '../types'
import { formatDate } from '../utils/date'
import { escapeHtml } from '../utils/dom'
import { getMoodLabel } from '../utils/moods'

/** Builds the HTML for ONE entry card. Shared by every list on the page. */
export function renderEntryCard(entry: JournalEntry, index: number): string {
  const title: string = escapeHtml(entry.title)
  const edited: string = entry.updatedAt !== undefined ? '<span class="entry-card__edited">edited</span>' : ''
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
          <button class="icon-btn icon-btn--favorite" type="button" data-action="favorite"
            aria-pressed="${entry.favorite}" aria-label="${favoriteLabel}">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2 22 12 12 22 2 12Z" /></svg>
          </button>
          <button class="btn btn--small" type="button" data-action="edit" aria-label="Edit ${title}">Edit</button>
          <button class="btn btn--small btn--danger" type="button" data-action="delete" aria-label="Delete ${title}">Delete</button>
        </div>
      </footer>
    </article>`
}
