import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '^/.*\\.php': {
        target: 'http://localhost/manga_api',
        changeOrigin: true,
      },
      '^/storage/.*': {
        target: 'http://localhost/manga_api',
        changeOrigin: true,
      }
    }
  }
})
