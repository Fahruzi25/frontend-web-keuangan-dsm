import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Saat backend siap, aktifkan proxy agar fetch('/api/...') diteruskan ke server Node:
  // server: { proxy: { '/api': 'http://localhost:3000' } },
});