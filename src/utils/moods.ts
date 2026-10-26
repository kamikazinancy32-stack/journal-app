import type { Mood, MoodOption } from '../types/index.js'

// `readonly` array: the list of moods can be read but never changed at runtime.
export const MOOD_OPTIONS: readonly MoodOption[] = [
  { value: 'happy', label: 'Happy' },
  { value: 'calm', label: 'Calm' },
  { value: 'sad', label: 'Sad' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'excited', label: 'Excited' },
]

// Type guard: if this returns true, TypeScript knows `value` is a Mood.
export function isMood(value: unknown): value is Mood {
  return typeof value === 'string' && MOOD_OPTIONS.some((option) => option.value === value)
}

export function getMoodLabel(mood: Mood): string {
  return MOOD_OPTIONS.find((option) => option.value === mood)?.label ?? mood
}
