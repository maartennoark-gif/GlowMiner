import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  // Tauri dev server port must match tauri.conf.json devUrl
  server: { port: 5173, strictPort: true },
})
