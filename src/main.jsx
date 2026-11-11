import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { BrowserRouter } from 'react-router-dom'
import WebFixTheme from './components/ui/WebFixTheme'

// Migrar suavemente cualquier URL previa con hash (#/superadmin -> /superadmin)
if (typeof window !== 'undefined' && window.location.hash && window.location.hash.startsWith('#/')) {
  const cleanPath = window.location.hash.substring(1);
  window.history.replaceState(null, '', cleanPath);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WebFixTheme>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </WebFixTheme>
  </StrictMode>,
)
