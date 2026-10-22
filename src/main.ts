import './style.css'

const app: HTMLDivElement | null = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `<h1>Journal</h1><p>Project setup complete.</p>`
}
