import type { UserConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import packageJson from './package.json'

export default defineConfig(({ mode }) => {
  let build: UserConfig['build'], esbuild: UserConfig['esbuild'], define: UserConfig['define']

  if (mode === 'development') {
    build = {
      minify: false,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'lucide': ['lucide-react'],
          },
        },
      },
    }
    esbuild = {
      jsxDev: false,
      keepNames: false,
      minifyIdentifiers: false,
    }
    define = {
      'process.env.NODE_ENV': '"development"',
      '__DEV__': 'true',
      '__APP_VERSION__': JSON.stringify(packageJson.version)
    }
  } else {
    define = {
      '__APP_VERSION__': JSON.stringify(packageJson.version)
    }
  }

  return {
    plugins: [react()],
    build,
    esbuild,
    define,
    resolve: { alias: { '@': '/src' } },
  }
})
