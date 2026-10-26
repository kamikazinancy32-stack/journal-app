/*
 * ─── Why do we use both `type` and `interface`? ──────────────────────────
 *
 *  • `interface` → for OBJECT SHAPES: things with named properties, like a
 *    JournalEntry. An interface reads as "every object of this kind must look
 *    like this", it can be extended with `extends`, and errors are clear.
 *
 *  • `type`      → for things an interface CANNOT describe: unions of literal
 *    values ('happy' | 'sad'), aliases that give a primitive a meaningful name,
 *    and types built from other types with utility types (Omit, Partial).
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

// `enum`: a named set of constants. A mood can only be one of these 5 members,
// so a typo like Mood.HAPY is a compile error instead of a hidden bug.
// String values keep localStorage readable ("happy", not 0).
export enum Mood {
  HAPPY = 'happy',
  SAD = 'sad',
  MOTIVATED = 'motivated',
  STRESSED = 'stressed',
  CALM = 'calm',
}

// `type`: an ALIAS. It is still a string, but the name says what it is for.
export type EntryId = string

// `type`: union of the two colour themes the app supports.
export type Theme = 'light' | 'dark'

// `type`: union of the actions a button on an entry card can trigger.
export type CardAction = 'edit' | 'delete' | 'favorite'

// `interface`: the shape of ONE journal entry as it is saved in localStorage.
export interface JournalEntry {
  id: EntryId
  title: string
  content: string
  date: string // the day the entry is about, as "YYYY-MM-DD"
  mood: Mood
  favorite: boolean
  createdAt: number // timestamp in milliseconds
  updatedAt?: number // OPTIONAL (?): only exists after the entry is edited
}

// `type`: built FROM JournalEntry with utility types.
// A draft is what the form produces: no id or timestamps yet.
export type EntryDraft = Omit<JournalEntry, 'id' | 'favorite' | 'createdAt' | 'updatedAt'>
// Partial makes every property optional, so an update can change just one field.
export type EntryUpdate = Partial<EntryDraft>

// `interface`: the shape of one option in the mood picker.
export interface MoodOption {
  value: Mood
  label: string
}

// `interface`: what the screen is currently showing.
export interface ViewState {
  editingId: EntryId | null // null means "creating a new entry"
}
