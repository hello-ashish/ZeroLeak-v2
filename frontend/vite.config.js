import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // '/api': 'http://localhost:4000',
      '/api': 'http://127.0.0.1:4000',
      '/proctoring': {
        target: 'http://127.0.0.1:4000',
        ws: true
      },
      '/socket.io': {
        // '/api': 'http://localhost:4000',
        target: 'http://127.0.0.1:4000',
        ws: true
      }
    }
  },
})
