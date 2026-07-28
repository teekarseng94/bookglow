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
