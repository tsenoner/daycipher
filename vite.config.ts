import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PWA configuration is added in the PWA task (Plan Task 13).
export default defineConfig({
  plugins: [react()],
})
