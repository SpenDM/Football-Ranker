import {
	createLeague,
	MAX_LEAGUES,
	type League,
	type NewLeague
} from '$lib/leagues/fantasy';
import { Persisted } from './persisted.svelte';

type Listener = (id: string) => void;

export type LeagueView = 'roster' | 'players' | 'standings' | 'settings';

/** The leagues in this browser. Signed-in users' leagues are also synced to Firestore. */
class LeaguesStore {
	list = new Persisted<League[]>('leagues', []);
	/** The open view, remembered per browser. */
	view = new Persisted<LeagueView>('league-view', 'roster');
	/** The team being managed in each league, remembered per browser. */
	myTeam = new Persisted<Record<string, string>>('league-teams', {});

	canCreate = $derived(this.list.current.length < MAX_LEAGUES);

	#listeners = new Set<Listener>();

	/** Called with a league's id whenever the user creates, edits or deletes it. */
	onChange(listener: Listener): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	#changed(id: string): void {
		for (const l of this.#listeners) l(id);
	}

	byId(id: string | null): League | undefined {
		return this.list.current.find((l) => l.id === id);
	}

	create(
		input: NewLeague,
		context: { season: number; week: number; owner: string | null }
	): League | null {
		if (!this.canCreate) return null;
		const league = createLeague(input, context);
		this.list.current.push(league);
		this.#changed(league.id);
		return league;
	}

	/**
	 * Apply an edit to a league. The edit returns why it couldn't be made (and must then leave
	 * the league untouched), or nothing on success.
	 */
	edit(id: string, edit: (league: League) => string | null | void): string | null {
		const league = this.byId(id);
		if (!league) return 'League not found.';
		const problem = edit(league);
		if (problem) return problem;
		league.updatedAt = Date.now();
		this.#changed(id);
		return null;
	}

	remove(id: string): void {
		this.list.current = this.list.current.filter((l) => l.id !== id);
		delete this.myTeam.current[id];
		this.#changed(id);
	}

	/** Replace the list from cloud sync (does not notify listeners). */
	replaceAll(list: League[]): void {
		this.list.current = list;
	}

	/** On sign-out: remove leagues belonging to an account from this browser. */
	removeOwned(): void {
		this.replaceAll(this.list.current.filter((l) => l.owner == null));
	}
}

export const leagues = new LeaguesStore();
