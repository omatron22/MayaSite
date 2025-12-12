import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initDatabase } from './lib/db'

// Initialize database (but don't block app render)
initDatabase()
  .then(() => console.log('✅ Database ready'))
  .catch((error) => console.error('❌ Database init failed:', error));

// Render app immediately
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
