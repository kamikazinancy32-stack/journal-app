/** Creates a unique id for a new entry. */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older browsers / non-secure contexts.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
