// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface ImportMetaEnv {
		readonly VITE_FIREBASE_API_KEY?: string;
		readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
		readonly VITE_FIREBASE_PROJECT_ID?: string;
		readonly VITE_FIREBASE_APP_ID?: string;
		readonly VITE_FIREBASE_USE_EMULATORS?: string;
	}
}

export {};
