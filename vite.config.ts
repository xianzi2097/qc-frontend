import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  build: {
    outDir: resolve(__dirname, '../../qc-pocket-space/frontend/dashboard'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})