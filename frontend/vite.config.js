import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:4000',
      '/proctoring': {
        target: 'http://localhost:4000',
        ws: true
      }
    }
  },
})
