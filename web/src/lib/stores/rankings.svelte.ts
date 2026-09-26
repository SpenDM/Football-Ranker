import {
	normalizePlacement,
	placeInSlot,
	setTierTeams,
	unplaceTeams
} from '$lib/power-rankings/placements';
import type { Framework, Placement } from '$lib/power-rankings/types';
import { Persisted } from './persisted.svelte';

/** Team placements for every framework, keyed by framework id. */
class RankingsStore {
	placements = new Persisted<Record<string, Placement>>('placements', {});

	for(fw: Framework): Placement {
		return normalizePlacement(this.placements.current[fw.id], fw);
	}

	setTier(fw: Framework, tierId: string, abbrs: string[]): void {
		this.placements.current[fw.id] = normalizePlacement(
			setTierTeams(this.for(fw), tierId, abbrs),
			fw
		);
	}

	/** Ranked frameworks: put a team in rank slot `index` (swapping if it was already ranked). */
	placeAt(fw: Framework, index: number, abbr: string): void {
		const tierId = fw.tiers[0].id;
		const current = this.for(fw);
		this.placements.current[fw.id] = normalizePlacement(
			{ ...current, [tierId]: placeInSlot(current[tierId], index, abbr) },
			fw
		);
	}

	unplace(fw: Framework, abbrs: string[]): void {
		this.placements.current[fw.id] = unplaceTeams(this.for(fw), abbrs, fw);
	}

	clear(fw: Framework): void {
		delete this.placements.current[fw.id];
	}

	/** Re-apply the framework's structure (after tiers are removed or slots reduced). */
	normalize(fw: Framework): void {
		if (this.placements.current[fw.id]) this.placements.current[fw.id] = this.for(fw);
	}

	copy(fromId: string, toId: string): void {
		const source = this.placements.current[fromId];
		if (source) this.placements.current[toId] = JSON.parse(JSON.stringify(source));
	}

	remove(id: string): void {
		delete this.placements.current[id];
	}
}

export const rankings = new RankingsStore();
