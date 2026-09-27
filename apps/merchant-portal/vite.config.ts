import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readGitCommit(root: string): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function bookglowBuildInfo(root: string) {
  return {
    name: 'BookGlow frontend',
    commit: readGitCommit(root),
    built: new Date().toISOString(),
    density: 'v4',
  };
}

function bookglowBuildInfoPlugin(root: string): Plugin {
  const info = bookglowBuildInfo(root);
  return {
    name: 'bookglow-build-info',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'bookglow-build.json',
        source: `${JSON.stringify(info, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const root = path.resolve(__dirname);
  const env = loadEnv(mode, root, '');
  const buildInfo = bookglowBuildInfo(root);

  return {
    root,
    base: process.env.VERCEL ? '/merchant-assets/' : '/',
    server: {
      port: 5173,
      host: true,
      strictPort: false,
      fs: { allow: [path.resolve(root, '../..')] },
    },
    plugins: [react({ include: /\.(tsx|jsx)$/ }), bookglowBuildInfoPlugin(root)],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
      __BOOKGLOW_BUILD__: JSON.stringify(buildInfo),
    },
    resolve: {
      // Onboarding imports the customer-site wizard, which has its own React.
      // Two Reacts make hooks throw: Cannot read properties of null (reading 'useState').
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      alias: {
        '@': root,
        react: path.resolve(root, 'node_modules/react'),
        'react-dom': path.resolve(root, 'node_modules/react-dom'),
        'react-dom/client': path.resolve(root, 'node_modules/react-dom/client'),
        'react/jsx-runtime': path.resolve(root, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(root, 'node_modules/react/jsx-dev-runtime'),
        'react-router-dom': path.resolve(root, 'node_modules/react-router-dom'),
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
        output: {
          manualChunks(id) {
            const normalized = id.replace(/\\/g, '/');
            if (
              normalized.includes('/node_modules/react/') ||
              normalized.includes('/node_modules/react-dom/') ||
              normalized.includes('/node_modules/scheduler/')
            ) {
              return 'react';
            }
          },
        },
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
