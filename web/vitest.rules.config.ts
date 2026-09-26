import { defineConfig } from 'vitest/config';

// Firestore security rules tests; run against the emulator via `npm run test:rules`.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['rules-tests/**/*.test.ts']
	}
});
