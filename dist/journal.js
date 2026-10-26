import { isCardAction, isMood, loadEntries, loadTheme, saveEntries, saveTheme } from './storage.js';
import { EntryForm, announce, applyTheme, getElement, renderEntryList, renderMoodFilter } from './ui.js';
// ── Journal logic ───────────────────────────────────────────────────────
/**
 * GENERIC search helper. <T> is "any kind of object in the list", and
 * `key: keyof T` means the key must be a real property of T, so
 * findByProperty(journal, 'titel', ...) is a compile error.
 * Example: findByProperty(journal, 'id', '42') finds the entry with id '42'.
 */
export function findByProperty(list, key, value) {
    return list.find((item) => item[key] === value);
}
/**
 * Checks user input. `Partial<JournalEntry>` makes every field optional, so we
 * cannot assume title, content or mood exist: each one is checked here.
 * Returns the cleaned draft, or the list of problems.
 */
export function validateEntry(input) {
    const title = input.title?.trim() ?? '';
    const content = input.content?.trim() ?? '';
    const mood = input.mood; // re-checked at runtime: it came from the page
    const errors = [];
    if (title === '')
        errors.push({ field: 'title', message: 'Give your entry a title.' });
    if (content === '')
        errors.push({ field: 'content', message: 'Write something before saving.' });
    if (!isMood(mood))
        errors.push({ field: 'mood', message: 'Pick a mood from the list.' });
    // After this line TypeScript knows `mood` is a Mood (the type guard narrowed it).
    if (errors.length > 0 || !isMood(mood))
        return { ok: false, errors };
    return { ok: true, value: { title, content, mood } };
}
/**
 * Keeps the entries that match the chosen mood AND contain the search text
 * in their title or content (not case-sensitive). Returns a new Journal.
 */
export function filterEntries(journal, filter) {
    const search = filter.search.trim().toLowerCase();
    return journal.filter((entry) => {
        const moodMatches = filter.mood === 'all' || entry.mood === filter.mood;
        const textMatches = search === '' || entry.title.toLowerCase().includes(search) || entry.content.toLowerCase().includes(search);
        return moodMatches && textMatches;
    });
}
/**
 * CLASS that owns all journal entries.
 * The UI never edits entries directly: it asks the store, and the store saves
 * to localStorage and tells every listener to re-render.
 */
export class JournalStore {
    constructor() {
        this.listeners = [];
        this.entries = loadEntries();
    }
    /** A getter: used like a property, `store.count`. */
    get count() {
        return this.entries.length;
    }
    /** Returns a copy so callers cannot change the store by accident. */
    getAll() {
        return [...this.entries];
    }
    /** Validates the input, then builds a complete entry (id + timestamp) and saves it. */
    addEntry(input) {
        const draft = validateEntry(input);
        if (!draft.ok)
            return draft;
        const entry = { ...draft.value, id: crypto.randomUUID(), timestamp: Date.now() };
        this.entries = [entry, ...this.entries];
        this.commit();
        return { ok: true, value: entry };
    }
    /** Applies changes to an existing entry. id and timestamp never change. */
    editEntry(id, changes) {
        const existing = findByProperty(this.entries, 'id', id);
        if (!existing)
            return { ok: false, errors: [{ message: 'That entry no longer exists.' }] };
        const draft = validateEntry({ ...existing, ...changes });
        if (!draft.ok)
            return draft;
        const updated = { ...existing, ...draft.value };
        this.entries = this.entries.map((entry) => (entry.id === id ? updated : entry));
        this.commit();
        return { ok: true, value: updated };
    }
    /** Returns true if something was deleted. */
    deleteEntry(id) {
        const before = this.entries.length;
        this.entries = this.entries.filter((entry) => entry.id !== id);
        if (this.entries.length === before)
            return false;
        this.commit();
        return true;
    }
    /** Registers a listener and returns a function that unregisters it. */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index >= 0)
                this.listeners.splice(index, 1);
        };
    }
    commit() {
        saveEntries(this.entries);
        const snapshot = this.getAll();
        this.listeners.forEach((listener) => listener(snapshot));
    }
}
// ── Setup ───────────────────────────────────────────────────────────────
const store = new JournalStore();
const state = { editingId: null, filter: { mood: 'all', search: '' } };
const listEl = getElement('#entry-list', HTMLElement);
const countEl = getElement('#entry-count', HTMLElement);
const themeButton = getElement('#theme-toggle', HTMLButtonElement);
const searchInput = getElement('#filter-search', HTMLInputElement);
const moodFilter = getElement('#filter-mood', HTMLSelectElement);
const form = new EntryForm(getElement('#entry-form', HTMLFormElement), getElement('#form-heading', HTMLElement));
// ── Rendering ───────────────────────────────────────────────────────────
/** The entries that match the filters, newest first. */
function getVisibleEntries() {
    return filterEntries(store.getAll(), state.filter).sort((a, b) => b.timestamp - a.timestamp);
}
function render() {
    const visible = getVisibleEntries();
    renderEntryList(listEl, visible, store.count);
    const total = store.count === 1 ? '1 entry' : `${store.count} entries`;
    countEl.textContent = visible.length === store.count ? total : `${visible.length} of ${total}`;
}
function stopEditing() {
    state.editingId = null;
    form.reset();
}
// ── Events ──────────────────────────────────────────────────────────────
form.onSubmit((input) => {
    const isEditing = state.editingId !== null;
    const result = state.editingId !== null ? store.editEntry(state.editingId, input) : store.addEntry(input);
    if (!result.ok) {
        form.showErrors(result.errors);
        return;
    }
    announce(`${isEditing ? 'Updated' : 'Saved'} “${result.value.title}”.`);
    stopEditing();
});
form.onCancel(stopEditing);
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.editingId !== null)
        stopEditing();
});
function handleCardAction(action, entry) {
    switch (action) {
        case 'edit':
            state.editingId = entry.id;
            form.startEditing(entry);
            break;
        case 'delete':
            if (window.confirm(`Delete “${entry.title}”? This cannot be undone.`)) {
                store.deleteEntry(entry.id);
                if (state.editingId === entry.id)
                    stopEditing();
                announce(`Deleted “${entry.title}”.`);
            }
            break;
    }
}
// One click listener for the whole list ("event delegation"), so newly
// rendered cards work without adding listeners to each button.
listEl.addEventListener('click', (event) => {
    if (!(event.target instanceof Element))
        return;
    const button = event.target.closest('button[data-action]');
    const id = button?.closest('.entry-card')?.dataset.id;
    const action = button?.dataset.action;
    const entry = id !== undefined ? findByProperty(store.getAll(), 'id', id) : undefined;
    if (entry && isCardAction(action))
        handleCardAction(action, entry);
});
// Filters: re-render on every keystroke / change. The select's value is a plain
// string, so the isMood type guard turns it back into a Mood (or 'all').
renderMoodFilter(moodFilter);
searchInput.addEventListener('input', () => {
    state.filter.search = searchInput.value;
    render();
});
moodFilter.addEventListener('change', () => {
    const value = moodFilter.value;
    state.filter.mood = isMood(value) ? value : 'all';
    render();
});
let theme = loadTheme();
applyTheme(theme, themeButton);
themeButton.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    saveTheme(theme);
    applyTheme(theme, themeButton);
});
store.subscribe(render);
render();
