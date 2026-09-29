import { Persisted } from './persisted.svelte';

export type RosterMode = 'team' | 'player';

/** Fantasy Roster Manager view, remembered per browser. */
export const rosterMode = new Persisted<RosterMode>('roster-mode', 'team');
