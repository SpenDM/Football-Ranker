// The Firebase web app config: Firebase console → Project settings → Your apps → Web app.
// SAFE TO COMMIT: these values identify the project rather than secure it (access is
// controlled by Firebase Auth + firestore.rules).
// Leave apiKey empty to disable sign-in; the site then saves everything in the browser only.
import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
	apiKey: '',
	authDomain: '',
	projectId: '',
	appId: ''
};
