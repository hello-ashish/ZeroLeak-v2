import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // '/api': 'http://backend:4000',
      '/api': 'http://backend:4000',
      '/proctoring': {
        target: 'http://backend:4000',
        ws: true
      },
      '/socket.io': {
        // '/api': 'http://backend:4000',
        target: 'http://backend:4000',
        ws: true
      }
    }
  },
})
