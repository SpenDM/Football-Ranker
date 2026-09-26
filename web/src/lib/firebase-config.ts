// The Firebase web app config: Firebase console → Project settings → Your apps → Web app.
// SAFE TO COMMIT: these values identify the project rather than secure it (access is
// controlled by Firebase Auth + firestore.rules).
// Leave apiKey empty to disable sign-in; the site then saves everything in the browser only.

// authDomain is this site's own domain rather than <projectId>.firebaseapp.com: the Worker
// (src/worker.ts) proxies /__/auth/* to Firebase so the Google sign-in popup also works in
// browsers that block third-party storage (see "Firebase" in the README for the setup).
import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
	apiKey: 'AIzaSyCcqLFURggGOShRIb0evVpnmD46d203yKo',
	authDomain: 'football.ranker.page',
	projectId: 'football-ranker',
	storageBucket: 'football-ranker.firebasestorage.app',
	messagingSenderId: '661433401760',
	appId: '1:661433401760:web:839dd81e6494c2d58724c5'
};
