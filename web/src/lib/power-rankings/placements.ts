import type { Framework, Placement } from './types';

/**
 * Drop tiers that no longer exist, duplicate teams, and ranks beyond the slot count.
 * Anything dropped simply returns to the pool.
 */
export function normalizePlacement(placement: Placement | undefined, fw: Framework): Placement {
	const seen = new Set<string>();
	const out: Placement = {};
	for (const tier of fw.tiers) {
		let list = (placement?.[tier.id] ?? []).filter((abbr) => {
			if (seen.has(abbr)) return false;
			seen.add(abbr);
			return true;
		});
		if (fw.kind === 'ranked') list = list.slice(0, fw.slots);
		out[tier.id] = list;
	}
	return out;
}

/** Set a tier's teams (e.g. after a drop), removing those teams from every other tier. */
export function setTierTeams(placement: Placement, tierId: string, abbrs: string[]): Placement {
	const moving = new Set(abbrs);
	const out: Placement = {};
	for (const [id, list] of Object.entries(placement)) {
		out[id] = id === tierId ? [] : list.filter((a) => !moving.has(a));
	}
	out[tierId] = [...abbrs];
	return out;
}

/** Return teams to the pool. */
export function unplaceTeams(placement: Placement, abbrs: string[]): Placement {
	const removing = new Set(abbrs);
	return Object.fromEntries(
		Object.entries(placement).map(([id, list]) => [id, list.filter((a) => !removing.has(a))])
	);
}

export function placedTeams(placement: Placement): Set<string> {
	return new Set(Object.values(placement).flat());
}
