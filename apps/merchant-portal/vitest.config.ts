import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@': root,
    },
  },
  test: {
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['test/visual/**', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
