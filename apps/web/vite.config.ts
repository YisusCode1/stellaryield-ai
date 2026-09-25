import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Keep the documented repository-root .env as the single source of public
  // Testnet configuration for the web workspace.
  envDir: '../..',
  plugins: [react()],
})
