import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/tests/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts']
  }
});
