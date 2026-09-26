import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;

const config = {
	apiKey: env.VITE_FIREBASE_API_KEY,
	authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: env.VITE_FIREBASE_PROJECT_ID,
	appId: env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

/** Lazily initialized so pages that never touch Firebase don't pay for it. */
export function firebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
	if (!app || !auth || !db) {
		app = initializeApp(config);
		auth = getAuth(app);
		db = initializeFirestore(app, { ignoreUndefinedProperties: true });
		if (env.VITE_FIREBASE_USE_EMULATORS === 'true') {
			connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
			connectFirestoreEmulator(db, '127.0.0.1', 8080);
		}
	}
	return { app, auth, db };
}
