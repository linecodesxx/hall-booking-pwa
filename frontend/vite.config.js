import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_URL?.replace(/\/+$/, '') || process.env.VITE_API_PROXY || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': apiTarget }
  }
});
