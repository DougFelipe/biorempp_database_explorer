import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devApiOrigin = process.env.VITE_DEV_API_ORIGIN || 'http://127.0.0.1:3101';
const rawBasePath = process.env.VITE_BIOREMPP_URL_BASE_PATH || process.env.BIOREMPP_URL_BASE_PATH || '/';

function normalizeBasePath(value: string) {
  const trimmed = String(value || '/').trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `/${withLeadingSlash.replace(/^\/+|\/+$/g, '')}/`;
}

const basePath = normalizeBasePath(rawBasePath);
const apiProxyPrefix = basePath === '/' ? '/api' : `${basePath}api`;

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      [apiProxyPrefix]: {
        target: devApiOrigin,
        changeOrigin: true,
      },
    },
  },
});
