import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { HashRouter } from 'react-router-dom'
import WebFixTheme from './components/ui/WebFixTheme'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WebFixTheme>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </WebFixTheme>
  </StrictMode>,
)
