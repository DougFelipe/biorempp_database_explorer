import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeBasePath(value: string) {
  const trimmed = String(value || '/').trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `/${withLeadingSlash.replace(/^\/+|\/+$/g, '')}/`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiOrigin = env.VITE_DEV_API_ORIGIN || 'http://127.0.0.1:3101';
  const rawBasePath = env.VITE_BIOREMPP_URL_BASE_PATH || env.BIOREMPP_URL_BASE_PATH || '/';
  const basePath = normalizeBasePath(rawBasePath);
  const apiProxyPrefix = basePath === '/' ? '/api' : `${basePath}api`;

  return {
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
  };
});
