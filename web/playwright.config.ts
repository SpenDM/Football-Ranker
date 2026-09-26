import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	webServer: {
		// Serve through the same Workers static-assets config used in production.
		command: 'npm run build && wrangler dev --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://localhost:4173',
		// Locally, use the installed Chrome instead of downloading Playwright's Chromium.
		channel: process.env.CI ? undefined : 'chrome'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 1300 } }
		}
	]
});
