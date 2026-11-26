import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  outputDir: './playwright-artifacts/e2e/results',
  reporter: [['list'], ['html', {open: 'never', outputFolder: 'playwright-artifacts/e2e/report'}]],
  use: {trace: 'retain-on-failure', screenshot: 'only-on-failure', colorScheme: 'light'},
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 900}}},
    {name: 'mobile', use: {...devices['Pixel 5']}},
    {name: 'mobile-safari', use: {...devices['iPhone 13'], defaultBrowserType: 'webkit'}},
  ],
});
