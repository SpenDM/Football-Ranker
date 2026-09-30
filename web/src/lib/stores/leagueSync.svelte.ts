import { mergeLeagues } from '$lib/leagues/sync';
import type { League } from '$lib/leagues/fantasy';
import { auth } from './auth.svelte';
import type { SyncStatus } from './cloudSync.svelte';
import { leagues } from './leagues.svelte';
import { Persisted } from './persisted.svelte';

const WRITE_DEBOUNCE_MS = 800;

/**
 * Keeps a signed-in user's leagues in Firestore (`leagues/{id}`, one document per league) in
 * sync with this browser. localStorage is always written first; the cloud copy follows.
 */
class LeagueSync {
	status = $state<SyncStatus>('off');
	/** Leagues changed or deleted while signed in and not yet written to Firestore. */
	pending = new Persisted<string[]>('leaguesPending', []);

	#uid: string | null = null;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#version = 0;
	#started = false;

	start(): void {
		if (this.#started) return;
		this.#started = true;
		auth.onChange((user) => (user ? this.#onLogin(user.uid) : this.#onLogout()));
		leagues.onChange((id) => {
			if (!this.#uid) return;
			const league = leagues.byId(id);
			if (league) league.owner ??= this.#uid;
			if (!this.pending.current.includes(id)) this.pending.current.push(id);
			this.#version++;
			this.#schedule();
		});
	}

	async #onLogin(uid: string): Promise<void> {
		this.#uid = uid;
		this.status = 'syncing';
		try {
			const fs = await this.#firestore();
			const snap = await fs.getDocs(
				fs.query(fs.collection(fs.db, 'leagues'), fs.where('owner', '==', uid))
			);
			if (this.#uid !== uid) return;
			const remote = snap.docs.map((d) => d.data() as League);
			const { merged, upload } = mergeLeagues(
				leagues.list.current,
				remote,
				uid,
				new Set(this.pending.current)
			);
			leagues.replaceAll(merged);
			this.pending.current = [...upload];
			await this.flush();
			this.status = 'synced';
		} catch (err) {
			console.error('League sync failed', err);
			this.status = 'error';
		}
	}

	#onLogout(): void {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		this.#uid = null;
		this.pending.current = [];
		leagues.removeOwned();
		this.status = 'off';
	}

	#schedule(): void {
		clearTimeout(this.#timer);
		this.status = 'syncing';
		this.#timer = setTimeout(async () => {
			this.#timer = undefined;
			try {
				await this.flush();
				this.status = 'synced';
			} catch (err) {
				console.error('League sync failed', err);
				this.status = 'error';
			}
		}, WRITE_DEBOUNCE_MS);
	}

	/** Write every pending league to Firestore (deleting the ones no longer in this browser). */
	async flush(): Promise<void> {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		const uid = this.#uid;
		const ids = [...this.pending.current];
		if (!uid || !ids.length) return;
		const version = this.#version;
		const fs = await this.#firestore();
		await Promise.all(
			ids.map((id) => {
				const ref = fs.doc(fs.db, 'leagues', id);
				const league = leagues.byId(id);
				return league?.owner === uid
					? fs.setDoc(ref, JSON.parse(JSON.stringify(league)))
					: fs.deleteDoc(ref);
			})
		);
		// Leagues changed while writing stay pending; a new write is already scheduled for them.
		if (version === this.#version) this.pending.current = [];
	}

	async #firestore() {
		const [{ firebase }, fs] = await Promise.all([
			import('$lib/firebase'),
			import('firebase/firestore')
		]);
		return { db: firebase().db, ...fs };
	}
}

export const leagueSync = new LeagueSync();
