/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const frontendPort = Number(process.env.FRONTEND_PORT) || 5173

// Full absolute URL — origin *and* path, always trailing-slash-terminated — this build will be
// served from. Always absolute (never a bare pathname) so it's unambiguous wherever it's set
// (CI logs, local shell) what site it refers to. Defaults to the local dev server's own origin,
// reusing the same `frontendPort` the dev server itself listens on, so plain `npm run dev`/
// `npm run build:static` need no env var at all. A static-hosting deploy overrides it with the
// real deployed URL, e.g. a GitHub Pages project site at `https://user.github.io/repo/` — see
// `.github/workflows/deploy-pages.yml`.
const basePathUrl = new URL(
  process.env.CRYSTALLINE_BASE_PATH || `http://localhost:${frontendPort}/`,
)
// Vite's `base` (and, downstream, BrowserRouter's `basename`) must end in `/` — guard against a
// caller-supplied CRYSTALLINE_BASE_PATH that forgot the trailing slash, rather than trusting it.
const basePath = basePathUrl.pathname.endsWith('/')
  ? basePathUrl.pathname
  : `${basePathUrl.pathname}/`

// https://vite.dev/config/
export default defineConfig({
  // Only the pathname (not the origin) feeds Vite's `base` — this app is always served
  // same-origin (GitHub Pages, or local dev), so asset URLs only need to be root-relative, not
  // absolute with a baked-in origin. This also drives BrowserRouter's `basename` in `App.tsx`
  // via Vite's own `import.meta.env.BASE_URL`, which mirrors whatever `base` resolves to.
  base: basePath,
  plugins: [react()],
  resolve: {
    // @mantine/dates otherwise gets pre-bundled with its own copy of @mantine/core, breaking
    // MantineProvider's React context across the boundary ("MantineProvider was not found").
    dedupe: ['@mantine/core', '@mantine/hooks', 'react', 'react-dom'],
  },
  server: {
    // Configurable via env so `scripts/run-app.sh` can run a verification instance on
    // non-default ports without colliding with a developer's own already-running dev servers.
    port: frontendPort,
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
