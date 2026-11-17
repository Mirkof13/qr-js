import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Config temporal sólo para la verificación automatizada (sin HTTPS autofirmado).
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['three'] },
  server: { port: 5174, host: true },
})
