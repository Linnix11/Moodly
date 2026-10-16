import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import './index.css'

const root = createRoot(document.getElementById('root')!)

// Import dynamique : si la configuration manque (ex. variables Supabase absentes au build),
// on affiche l'erreur au lieu d'une page blanche.
import('./App')
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    console.error(error)
    root.render(
      <div style={{ padding: '2rem', fontFamily: 'Poppins, sans-serif', maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Le site n'a pas pu démarrer</h1>
        <p style={{ marginTop: '0.75rem' }}>{error instanceof Error ? error.message : String(error)}</p>
      </div>,
    )
  })
