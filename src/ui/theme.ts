import type { Theme } from '../types'
import { isTheme } from '../utils/guards'
import { TypedStorage } from '../utils/storage'

const prefersDark: boolean = window.matchMedia('(prefers-color-scheme: dark)').matches
const themeStorage = new TypedStorage<Theme>('imigongo-journal:theme', isTheme, prefersDark ? 'dark' : 'light')

function applyTheme(theme: Theme, button: HTMLButtonElement): void {
  document.documentElement.dataset.theme = theme
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
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
