import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {

  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');




  // Determine base path
  const base = command === 'build' && env.BUILD_TARGET === 'gh-pages'
    ? '/nodeBox/'
    : '/';

  return {
    base,
    build: {
      outDir: 'docs',
      emptyOutDir: true,
      rollupOptions: {
        input: '/index.html',
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      }
    },
    server: {
      origin: 'http://localhost:5173',
    }
  }
})