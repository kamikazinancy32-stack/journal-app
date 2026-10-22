/** Reads a short message aloud for screen-reader users (via an aria-live region). */
export function announce(message: string): void {
  const region: HTMLElement | null = document.getElementById('announcer')
  if (!region) return
  region.textContent = ''
  // A tiny delay makes screen readers notice the change even for repeated messages.
  window.setTimeout((): void => {
    region.textContent = message
  }, 50)
}
