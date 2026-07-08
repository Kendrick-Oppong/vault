import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import { QueryProvider, ToastProvider } from '@/providers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <ToastProvider />
    </QueryProvider>
  </StrictMode>
)
