import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    actionTimeout: 10000,
    baseURL: 'http://127.0.0.1:5173',
    locale: 'es-CR',
    geolocation: { latitude: 10.38, longitude: -85.71 },
    permissions: ['geolocation'],
  },
  webServer: process.env.URL_PRODUCCION
    ? {
        command: 'npx vite preview --host 127.0.0.1 --port 4175 --strictPort',
        url: process.env.URL_PRODUCCION,
        reuseExistingServer: true,
      }
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: true,
      },
})
