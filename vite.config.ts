import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devApiOrigin = process.env.VITE_DEV_API_ORIGIN || 'http://127.0.0.1:3101';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: devApiOrigin,
        changeOrigin: true,
      },
      '/assets': {
        target: devApiOrigin,
        changeOrigin: true,
      },
    },
  },
});
