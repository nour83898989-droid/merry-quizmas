/**
 * Playwright config for Synpress E2E tests with MetaMask
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/wallet',
  fullyParallel: false, // MetaMask tests must run sequentially
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for wallet tests
  workers: 1, // Single worker for MetaMask
  reporter: [
    ['html', { outputFolder: 'playwright-report-synpress' }],
    ['list'],
  ],
  timeout: 120000, // 2 minutes per test (blockchain can be slow)
  expect: {
    timeout: 30000, // 30 seconds for assertions
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
    // Synpress requires headed mode
    headless: false,
  },
  projects: [
    {
      name: 'synpress-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use persistent context for MetaMask
        launchOptions: {
          slowMo: 100, // Slow down for stability
        },
      },
    },
  ],
  // Start dev server before tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
