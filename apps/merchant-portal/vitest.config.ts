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
      '@bookglow/auth-contracts': path.resolve(root, '../../packages/auth-contracts/src/index.ts'),
      '@bookglow/database-contracts': path.resolve(root, '../../packages/database-contracts/src/index.ts'),
      '@bookglow/shared-types': path.resolve(root, '../../packages/shared-types/src/index.ts'),
      '@bookglow/supabase': path.resolve(root, '../../packages/supabase/src/index.ts'),
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
