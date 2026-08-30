import { defineConfig, devices } from '@playwright/test';

// Reusable geometry/integrity regression suite — see tests/e2e/geometry.spec.js.
// This replaces Copilot's one-off DOM auditor (never persisted as a real test)
// with something that survives across sessions and runs the same way every time.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
