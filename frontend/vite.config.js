import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the 'env' directory.
  const env = loadEnv(mode, './env', '');

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    envDir: './env',
    server: {
      proxy: {
        '/api': {
          // Use VITE_API_URL from .env files, fallback to local for safety
          target: env.VITE_API_URL || 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  }
})
