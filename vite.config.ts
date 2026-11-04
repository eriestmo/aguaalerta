import { copyFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'
  const supabase = env.VITE_SUPABASE_URL || ''
  const ws = supabase.replace(/^http/, 'ws')
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: blob: https://tile.openstreetmap.org ${supabase}`,
    `connect-src 'self' ${supabase} ${ws}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    base,
    test: { exclude: ['e2e/**', 'node_modules/**', 'dist/**'] },
    plugins: [
      react(),
      {
        name: 'produccion',
        apply: 'build',
        transformIndexHtml: (html) =>
          html.replace(
            '<meta name="author"',
            `<meta http-equiv="Content-Security-Policy" content="${csp}"/><meta name="referrer" content="strict-origin-when-cross-origin"/><meta name="author"`
          ),
        // GitHub Pages sirve 404.html en rutas internas; asi los enlaces directos abren la app.
        closeBundle: () => copyFileSync('dist/index.html', 'dist/404.html'),
      },
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'AguaAlerta',
          short_name: 'AguaAlerta',
          description: 'Reporte de fugas y fallas de agua a su ASADA',
          lang: 'es',
          start_url: base,
          scope: base,
          theme_color: '#0B5F73',
          background_color: '#F5F6F1',
          display: 'standalone',
          icons: [
            { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icono-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: { navigateFallbackDenylist: [/^\/auth/, /^\/supabase/] },
      }),
    ],
  }
})
