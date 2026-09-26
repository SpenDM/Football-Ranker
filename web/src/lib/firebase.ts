import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

/** Lazily initialized so pages that never touch Firebase don't pay for it. */
export function firebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
	if (!app || !auth || !db) {
		app = initializeApp(firebaseConfig);
		auth = getAuth(app);
		db = initializeFirestore(app, { ignoreUndefinedProperties: true });
		if (import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true') {
			connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
			connectFirestoreEmulator(db, '127.0.0.1', 8080);
		}
	}
	return { app, auth, db };
}
