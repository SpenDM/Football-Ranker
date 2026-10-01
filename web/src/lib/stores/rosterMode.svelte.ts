import { Persisted } from './persisted.svelte';
import type { SlotId } from '$lib/fantasy-roster/player-rankings';

/** 'team' is Team Rankings (named before Team Matchups existed, kept so saved choices still work). */
export type RosterMode = 'team' | 'matchups' | 'player';

/** Fantasy Roster Manager view, remembered per browser. */
export const rosterMode = new Persisted<RosterMode>('roster-mode', 'team');

/** Player mode's selected roster slot, remembered per browser. */
export const rosterSlot = new Persisted<SlotId>('roster-slot', 'QB');

/** Players (and D/STs, as "DST-<team>") marked not available, remembered per browser. */
export const unavailable = new Persisted<string[]>('roster-unavailable', []);

export function setAvailable(id: string, available: boolean): void {
	const rest = unavailable.current.filter((x) => x !== id);
	unavailable.current = available ? rest : [...rest, id];
}
