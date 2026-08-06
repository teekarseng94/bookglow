import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const root = path.resolve(__dirname);
  const env = loadEnv(mode, root, '');

  return {
    root,
    server: {
      port: 5173,
      host: true,
      strictPort: false,
    },
    plugins: [react({ include: /\.(tsx|jsx)$/ })],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
    },
    resolve: {
      alias: {
        '@': root,
        // Resolve workspace packages from source so deploy builds don't depend
        // solely on fragile file: symlinks under node_modules/@bookglow.
        '@bookglow/auth-contracts': path.resolve(root, '../../packages/auth-contracts/src/index.ts'),
        '@bookglow/database-contracts': path.resolve(root, '../../packages/database-contracts/src/index.ts'),
        '@bookglow/shared-types': path.resolve(root, '../../packages/shared-types/src/index.ts'),
        '@bookglow/supabase': path.resolve(root, '../../packages/supabase/src/index.ts'),
      },
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      commonjsOptions: { transformMixedEsModules: false },
      rollupOptions: {
        input: path.resolve(root, 'index.html'),
        maxParallelFileOps: 1,
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
  };
});
