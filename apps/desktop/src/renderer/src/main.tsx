import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { QueryProvider, ToastProvider } from '@/providers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <ToastProvider />
    </QueryProvider>
  </StrictMode>
)
