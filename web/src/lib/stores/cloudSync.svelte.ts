import {
	MAX_CUSTOM_FRAMEWORKS,
	mergeFrameworks,
	toRemote
} from '$lib/power-rankings/frameworks';
import type { Framework } from '$lib/power-rankings/types';
import { auth } from './auth.svelte';
import { frameworks } from './frameworks.svelte';
import { Persisted } from './persisted.svelte';

const WRITE_DEBOUNCE_MS = 500;

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error' | 'needs-attention';

/**
 * Keeps custom frameworks in `users/{uid}` (Firestore) in sync with this browser.
 * localStorage is always written first; the cloud copy follows while signed in.
 */
class CloudSync {
	status = $state<SyncStatus>('off');
	/** Set when merging on login produced more than the allowed number of frameworks. */
	overflow = $state<Framework[] | null>(null);
	/** True while this browser has account changes not yet written to Firestore. */
	dirty = new Persisted<boolean>('customsDirty', false);

	#uid: string | null = null;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#version = 0;
	#started = false;

	start(): void {
		if (this.#started) return;
		this.#started = true;
		auth.onChange((user) => (user ? this.#onLogin(user.uid) : this.#onLogout()));
		frameworks.onCustomsChange(() => {
			if (!this.#uid) return;
			for (const f of frameworks.customs.current) f.owner ??= this.#uid;
			this.dirty.current = true;
			this.#version++;
			if (!this.overflow) this.#schedule();
		});
	}

	async #onLogin(uid: string): Promise<void> {
		this.#uid = uid;
		this.status = 'syncing';
		try {
			const { getDoc, ref } = await this.#firestore(uid);
			const snap = await getDoc(ref);
			const remote = (snap.exists() ? (snap.data().frameworks as Framework[]) : []) ?? [];
			if (this.#uid !== uid) return;

			const merged = mergeFrameworks(
				frameworks.customs.current,
				remote,
				uid,
				this.dirty.current
			);
			if (merged.length > MAX_CUSTOM_FRAMEWORKS) {
				this.overflow = merged;
				this.status = 'needs-attention';
				return;
			}
			frameworks.replaceCustoms(merged);
			if (JSON.stringify(merged.map(toRemote)) !== JSON.stringify(remote)) await this.#write();
			else this.dirty.current = false;
			this.status = 'synced';
		} catch (err) {
			console.error('Cloud sync failed', err);
			this.status = 'error';
		}
	}

	#onLogout(): void {
		clearTimeout(this.#timer);
		this.#uid = null;
		this.overflow = null;
		this.dirty.current = false;
		frameworks.removeOwned();
		this.status = 'off';
	}

	/** Keep only the chosen frameworks after a login merge overflowed. */
	async resolveOverflow(keepIds: string[]): Promise<void> {
		if (!this.overflow || keepIds.length > MAX_CUSTOM_FRAMEWORKS) return;
		const keep = new Set(keepIds);
		frameworks.replaceCustoms(this.overflow.filter((f) => keep.has(f.id)));
		this.overflow = null;
		this.dirty.current = true;
		try {
			await this.#write();
			this.status = 'synced';
		} catch (err) {
			console.error('Cloud sync failed', err);
			this.status = 'error';
		}
	}

	/** Write any pending changes, then sign out (which clears account data from this browser). */
	async signOut(): Promise<void> {
		if (this.#timer !== undefined && this.dirty.current && !this.overflow) {
			clearTimeout(this.#timer);
			try {
				await this.#write();
			} catch (err) {
				console.error('Final sync before sign-out failed', err);
			}
		}
		await auth.signOut();
	}

	#schedule(): void {
		clearTimeout(this.#timer);
		this.status = 'syncing';
		this.#timer = setTimeout(async () => {
			this.#timer = undefined;
			try {
				await this.#write();
				this.status = 'synced';
			} catch (err) {
				console.error('Cloud sync failed', err);
				this.status = 'error';
			}
		}, WRITE_DEBOUNCE_MS);
	}

	async #write(): Promise<void> {
		const uid = this.#uid;
		if (!uid) return;
		const version = this.#version;
		const { ref, setDoc, serverTimestamp } = await this.#firestore(uid);
		await setDoc(ref, {
			frameworks: frameworks.customs.current.map(toRemote),
			updatedAt: serverTimestamp()
		});
		if (version === this.#version) this.dirty.current = false;
	}

	async #firestore(uid: string) {
		const [{ firebase }, fs] = await Promise.all([
			import('$lib/firebase'),
			import('firebase/firestore')
		]);
		const { db } = firebase();
		return {
			ref: fs.doc(db, 'users', uid),
			getDoc: fs.getDoc,
			setDoc: fs.setDoc,
			serverTimestamp: fs.serverTimestamp
		};
	}
}

export const cloudSync = new CloudSync();
