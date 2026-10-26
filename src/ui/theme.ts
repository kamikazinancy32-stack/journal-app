import type { Theme } from '../types/index.js'
import { isTheme } from '../utils/guards.js'
import { TypedStorage } from '../utils/storage.js'

const prefersDark: boolean = window.matchMedia('(prefers-color-scheme: dark)').matches
const themeStorage = new TypedStorage<Theme>('journal:theme', isTheme, prefersDark ? 'dark' : 'light')

function applyTheme(theme: Theme, button: HTMLButtonElement): void {
  document.documentElement.dataset.theme = theme
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  button.textContent = next === 'dark' ? 'Dark' : 'Light'
  button.setAttribute('aria-label', `Switch to ${next} mode`)
  button.setAttribute('aria-pressed', String(theme === 'dark'))
}

/** Restores the saved theme (or the system preference) and wires up the toggle. */
export function initThemeToggle(button: HTMLButtonElement): void {
  let theme: Theme = themeStorage.load()
  applyTheme(theme, button)

  button.addEventListener('click', (): void => {
    theme = theme === 'dark' ? 'light' : 'dark'
    themeStorage.save(theme)
    applyTheme(theme, button)
  })
}
