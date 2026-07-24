import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5353,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5355',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5355',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5353,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5355',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5355',
        changeOrigin: true,
      },
    },
  },
})
