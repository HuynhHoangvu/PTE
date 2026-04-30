import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      ignored: ['**/android/**', '**/ios/**', '**/node_modules/**'],
    },
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
