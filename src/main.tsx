import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'
import { MsalProviderWrapper } from './auth/MsalProviderWrapper'
import { AppProvider } from './context/AppContext'
import { FlashProvider } from './components/Flash'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <MsalProviderWrapper>
          <AppProvider>
            <FlashProvider>
              <App />
            </FlashProvider>
          </AppProvider>
        </MsalProviderWrapper>
      </HelmetProvider>
    </BrowserRouter>
  </StrictMode>,
)
