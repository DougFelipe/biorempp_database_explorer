import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

// Stub Vite env variables used by the frontend (override per-test with vi.stubEnv)
vi.stubEnv('VITE_BIOREMPP_URL_BASE_PATH', '/');

// Suppress noisy React warnings in test output.
// Remove the filter below if you want to see all React warnings.
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('Warning:') || msg.includes('ReactDOM.render')) return;
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});
