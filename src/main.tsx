import './styles/base.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { initPWA } from './pwa/registerSW'
import { useSettings, applyTheme } from './store/settings'

// Apply the stored theme on boot (the inline head script handles first paint;
// this keeps the runtime in sync, e.g. for 'system' following OS changes).
applyTheme(useSettings.getState().theme)
initPWA()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
