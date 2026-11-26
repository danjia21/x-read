import {defineConfig} from '@playwright/test';
import config from './playwright.config.js';

export default defineConfig({
  ...config,
  testMatch: '**/walkthrough.js',
  outputDir: './playwright-artifacts/walkthrough/results',
  reporter: [['list'], ['html', {open: 'never', outputFolder: 'playwright-artifacts/walkthrough/report'}]],
  projects: config.projects.filter(project => project.name === 'desktop'),
  use: {...config.use, video: {mode: 'on', size: {width: 1440, height: 900}}},
});
