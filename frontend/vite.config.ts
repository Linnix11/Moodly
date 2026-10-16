import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // host: true => accessible depuis le téléphone sur le même réseau avec `npm run dev`
  server: { host: true },
  // Recharts + Supabase ≈ 250 ko gzip : acceptable pour un MVP
  build: { chunkSizeWarningLimit: 1000 },
})
