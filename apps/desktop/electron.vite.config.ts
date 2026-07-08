import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@vault/types': resolve('../../packages/types/src'),
        '@vault/ui': resolve('../../packages/ui/src'),
        '@/lib': resolve('src/renderer/src/lib'),
        '@/components': resolve('src/renderer/src/components'),
        '@/providers': resolve('src/renderer/src/providers')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
