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

// `type`: union of the two colour themes the app supports.
export type Theme = 'light' | 'dark'

// `type`: union of the actions a button on an entry card can trigger.
export type CardAction = 'edit' | 'delete'

// `interface`: the shape of ONE journal entry as it is saved in localStorage.
export interface JournalEntry {
  id: string
  title: string
  content: string
  mood: Mood
  timestamp: number // when the entry was created, in milliseconds (Date.now())
}

// `type`: an ALIAS. A Journal is just an array of entries, but the name says
// what it is, so function signatures read like the app: (journal: Journal).
export type Journal = JournalEntry[]

// `type`: built FROM JournalEntry with utility types.
// A draft is what the form produces: no id or timestamp yet.
export type EntryDraft = Omit<JournalEntry, 'id' | 'timestamp'>
// Partial makes every property optional, so an update can change just one field.
export type EntryUpdate = Partial<EntryDraft>

// `interface`: the shape of one option in the mood picker.
export interface MoodOption {
  value: Mood
  label: string
}

// `interface`: what the screen is currently showing.
export interface ViewState {
  editingId: string | null // null means "creating a new entry"
}
