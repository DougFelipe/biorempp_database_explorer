const devApiPort = String(process.env.DEV_API_PORT || '3101').trim() || '3101';

// In local dev we always bind the API server to DEV_API_PORT (default 3101)
// so Vite proxy and backend stay aligned even if .env has PORT=3000 for prod.
process.env.PORT = devApiPort;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

await import('../server/index.mjs');
