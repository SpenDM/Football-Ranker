export type AppUser = {
	uid: string;
	displayName: string | null;
	email: string | null;
	photoURL: string | null;
};

type Listener = (user: AppUser | null) => void;

class AuthState {
	/** False when no Firebase config was provided at build time (login is hidden/disabled). */
	readonly available = Boolean(
		import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
	);
	user = $state<AppUser | null>(null);
	/** True once Firebase has reported the initial auth state. */
	ready = $state(false);
	error = $state<string | null>(null);

	#started = false;
	#listeners = new Set<Listener>();

	/** Subscribe to sign-in/sign-out transitions (called after `user` is updated). */
	onChange(listener: Listener): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	async init(): Promise<void> {
		if (this.#started) return;
		this.#started = true;
		if (!this.available) {
			this.ready = true;
			return;
		}
		const [{ firebase }, { onAuthStateChanged }] = await Promise.all([
			import('$lib/firebase'),
			import('firebase/auth')
		]);
		onAuthStateChanged(firebase().auth, (u) => {
			const prev = this.user?.uid ?? null;
			this.user = u
				? { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL }
				: null;
			this.ready = true;
			if (prev !== (this.user?.uid ?? null)) {
				for (const l of this.#listeners) l(this.user);
			}
		});
	}

	async signIn(): Promise<void> {
		this.error = null;
		const [{ firebase }, fa] = await Promise.all([
			import('$lib/firebase'),
			import('firebase/auth')
		]);
		const { auth } = firebase();
		const provider = new fa.GoogleAuthProvider();
		try {
			await fa.signInWithPopup(auth, provider);
		} catch (err) {
			const code = (err as { code?: string }).code;
			if (code === 'auth/popup-blocked') {
				await fa.signInWithRedirect(auth, provider);
			} else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
				this.error = 'Sign-in failed. Please try again.';
				console.error(err);
			}
		}
	}

	async signOut(): Promise<void> {
		const [{ firebase }, { signOut }] = await Promise.all([
			import('$lib/firebase'),
			import('firebase/auth')
		]);
		await signOut(firebase().auth);
	}
}

export const auth = new AuthState();
