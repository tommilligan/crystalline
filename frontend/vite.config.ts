/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // @mantine/dates otherwise gets pre-bundled with its own copy of @mantine/core, breaking
    // MantineProvider's React context across the boundary ("MantineProvider was not found").
    dedupe: ['@mantine/core', '@mantine/hooks', 'react', 'react-dom'],
  },
  server: {
    // Configurable via env so `scripts/run-app.sh` can run a verification instance on
    // non-default ports without colliding with a developer's own already-running dev servers.
    port: Number(process.env.FRONTEND_PORT) || 5173,
    strictPort: true,
    // Forward auth calls to the backend in dev, so the frontend can call a same-origin
    // `/api/...` path (see `src/liveblocks.config.ts`) without needing CORS.
    proxy: {
      '/api': `http://localhost:${Number(process.env.BACKEND_PORT) || 4000}`,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
