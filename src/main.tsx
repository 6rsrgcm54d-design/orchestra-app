import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

function mountApp() {
  const container = document.getElementById('root')
  if (!container) return false

  try {
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    return true
  } catch (err) {
    console.error('Error mounting React app:', err)
    container.innerHTML = `<div style="padding: 24px; font-family: sans-serif; color: #fff; background: #0f172a; min-height: 100vh;">
      <h2>Erro ao carregar a aplicação</h2>
      <p>${err instanceof Error ? err.message : String(err)}</p>
    </div>`
    return true
  }
}

if (!mountApp()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp)
  } else {
    window.addEventListener('load', mountApp)
  }
}
