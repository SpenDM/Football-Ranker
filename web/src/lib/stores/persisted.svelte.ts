/**
 * Reactive state mirrored to localStorage. Every change (including deep mutations) is
 * written back automatically, and changes made in other tabs are pulled in.
 */

export const STORAGE_PREFIX = 'ffr:v1:';

function storageAvailable(): boolean {
	try {
		return typeof localStorage !== 'undefined';
	} catch {
		return false;
	}
}

function read<T>(key: string, fallback: T): T {
	if (!storageAvailable()) return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

export class Persisted<T> {
	current = $state() as T;
	readonly key: string;

	constructor(key: string, initial: T) {
		this.key = STORAGE_PREFIX + key;
		this.current = read(this.key, initial);

		$effect.root(() => {
			$effect(() => {
				const serialized = JSON.stringify(this.current);
				if (!storageAvailable()) return;
				try {
					localStorage.setItem(this.key, serialized);
				} catch {
					// Quota exceeded or storage blocked: keep working in memory.
				}
			});
		});

		if (typeof window !== 'undefined') {
			window.addEventListener('storage', (e) => {
				if (e.key === this.key && e.newValue !== null) {
					try {
						this.current = JSON.parse(e.newValue) as T;
					} catch {
						// Ignore malformed values written by something else.
					}
				}
			});
		}
	}
}
