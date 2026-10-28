import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  workers: 2,
  fullyParallel: true,
  reporter: [['list'], ['json', { outputFile: 'validation/browser-results.json' }]],
  outputDir: 'validation/browser-artifacts',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    acceptDownloads: true,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader']
    }
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
