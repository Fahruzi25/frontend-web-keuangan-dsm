import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // teruskan permintaan /api ke backend; ganti port sesuai backend Anda
    proxy: { '/api': 'http://localhost:3000' },
  },
})