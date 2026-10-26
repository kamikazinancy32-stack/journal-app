import { Mood } from './types.js';
// ── Type guards ─────────────────────────────────────────────────────────
// Type guards turn `unknown` data (from JSON or the DOM) into trusted types.
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isString(value) {
    return typeof value === 'string';
}
export function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
// If this returns true, TypeScript knows `value` is a Mood.
export function isMood(value) {
    return Object.values(Mood).some((mood) => mood === value);
}
export function isTheme(value) {
    return value === 'light' || value === 'dark';
}
export function isCardAction(value) {
    return value === 'edit' || value === 'delete';
}
export function isJournalEntry(value) {
    if (!isRecord(value))
        return false;
    return (isString(value.id) &&
        isString(value.title) &&
        isString(value.content) &&
        isMood(value.mood) &&
        isNumber(value.timestamp));
}
/**
 * GENERIC guard factory: give it a guard for one item (T) and it returns a
 * guard for an array of those items (T[]).
 * Example: isArrayOf(isJournalEntry) checks a JournalEntry[].
 */
export function isArrayOf(itemGuard) {
    return (value) => Array.isArray(value) && value.every(itemGuard);
}
/**
 * GENERIC wrapper around localStorage.
 *
 * <T> is a placeholder for "the type of data stored under this key". The same
 * class works for entries (TypedStorage<Journal>) and for the theme
 * (TypedStorage<Theme>), and each copy is fully type-checked.
 *
 * It is not called `Storage` because the browser already has a built-in type
 * with that name (window.localStorage is a `Storage`).
 */
export class TypedStorage {
    constructor(key, validate, fallback) {
        this.key = key;
        this.validate = validate;
        this.fallback = fallback;
    }
    /** Reads and checks the saved value. Returns the fallback if it is missing or broken. */
    load() {
        try {
            const raw = localStorage.getItem(this.key);
            if (raw === null)
                return this.fallback;
            // JSON.parse could return anything, so we store it as `unknown` (never `any`)
            // and only trust it after the validator has checked it.
            const parsed = JSON.parse(raw);
            return this.validate(parsed) ? parsed : this.fallback;
        }
        catch {
            return this.fallback;
        }
    }
    /** Saves the value. Returns false if the browser refused (e.g. storage full). */
    save(value) {
        try {
            localStorage.setItem(this.key, JSON.stringify(value));
            return true;
        }
        catch {
            return false;
        }
    }
    clear() {
        localStorage.removeItem(this.key);
    }
}
// ── Journal and theme storage ───────────────────────────────────────────
const entryStorage = new TypedStorage('journal:entries', isArrayOf(isJournalEntry), []);
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const themeStorage = new TypedStorage('journal:theme', isTheme, prefersDark ? 'dark' : 'light');
/** Loads the saved entries, or an empty list if there are none or they are broken. */
export function loadEntries() {
    return entryStorage.load();
}
export function saveEntries(journal) {
    return entryStorage.save(journal);
}
/** Loads the saved theme, or the system preference if none was saved. */
export function loadTheme() {
    return themeStorage.load();
}
export function saveTheme(theme) {
    return themeStorage.save(theme);
}
