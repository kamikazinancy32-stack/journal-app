import { Mood } from '../types/index.js'
import type { MoodOption } from '../types/index.js'

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

// Type guard: if this returns true, TypeScript knows `value` is a Mood.
export function isMood(value: unknown): value is Mood {
  return Object.values(Mood).some((mood: Mood): boolean => mood === value)
}

export function getMoodLabel(mood: Mood): string {
  return MOOD_LABELS[mood]
}
