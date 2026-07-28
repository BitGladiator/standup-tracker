import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,       // bind to 0.0.0.0 — required inside Docker
    port: 5173,
    watch: {
      // Use polling for Docker Desktop / VirtioFS on macOS
      // (inotify events are unreliable through the hypervisor layer)
      usePolling: true,
      interval: 1000,
    },
  },
})

