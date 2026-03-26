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
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? '')
      },
      resolve: {
        alias: {
          '@': root,
        }
      },
      build: {
        // This is the #1 fix for memory crashes on Windows
        sourcemap: false,
        minify: 'esbuild',
        // Stop Vite from over-analyzing mixed CJS/ESM and getting stuck in dependency loops
        commonjsOptions: { transformMixedEsModules: false },
        // This forces Vite to stop trying to transform everything at once
        rollupOptions: {
          input: path.resolve(root, 'index.html'),
          // Do NOT externalize react/react-dom: external CDN + bundle = two React instances → "useRef" null error
          maxParallelFileOps: 1,
          output: {
            manualChunks: (id) => {
              // Entry chain only: tiny chunks so build doesn't hang
              if (id.endsWith('entry.js') || id === 'entry.js') return 'entry';
              if (id.endsWith('main.js') || id === 'main.js') return 'loader';
              if (id.endsWith('mount.js') || id === 'mount.js') return 'mount';
              // All node_modules in ONE vendor chunk (avoids circular chunk → "Cannot access 's1' before initialization")
              if (id.includes('node_modules')) return 'vendor';
            },
          },
        },
      },
      // Prevents Vite from getting stuck in a dependency loop
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'firebase/app', 'firebase/storage'],
        esbuildOptions: {
          target: 'es2020',
        },
      },
    };
});
