import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cross-origin isolation headers so the dev server matches production (Cloudflare
// `public/_headers`) and can run the multi-threaded engine (SharedArrayBuffer).
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { headers: isolation },
  preview: { headers: isolation },
})
