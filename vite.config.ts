import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/health':     { target: BACKEND, changeOrigin: true },
      '/ingest':     { target: BACKEND, changeOrigin: true },
      '/query':      { target: BACKEND, changeOrigin: true },
      '/collections':{ target: BACKEND, changeOrigin: true },
      '/evaluate':   { target: BACKEND, changeOrigin: true },
      '/cache_stats':{ target: BACKEND, changeOrigin: true },
      '/documents':  { target: BACKEND, changeOrigin: true },
      // /collections viz sub-routes are already covered by /collections proxy
    },
  },
})
