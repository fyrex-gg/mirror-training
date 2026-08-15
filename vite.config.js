import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repo is served from https://<username>.github.io/mirror-training/ —
// base must match the repo name or every built asset 404s on Pages.
export default defineConfig({
  plugins: [react()],
  base: '/mirror-training/',
  build: {
    outDir: 'dist',
  },
})
