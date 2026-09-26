import type { Framework, Placement } from './types';

/** Marks an empty rank slot in a ranked framework's list. */
export const EMPTY_SLOT = '';

function trimTrailingEmpty(list: string[]): string[] {
	let end = list.length;
	while (end > 0 && list[end - 1] === EMPTY_SLOT) end--;
	return list.slice(0, end);
}

/**
 * Drop tiers that no longer exist, duplicate teams, and ranks beyond the slot count.
 * Anything dropped simply returns to the pool. Ranked lists are positional: index i is rank
 * i + 1 and may be EMPTY_SLOT; tier lists never contain empty entries.
 */
export function normalizePlacement(placement: Placement | undefined, fw: Framework): Placement {
	const seen = new Set<string>();
	const firstSighting = (abbr: string) => {
		if (!abbr || seen.has(abbr)) return false;
		seen.add(abbr);
		return true;
	};
	const out: Placement = {};
	for (const tier of fw.tiers) {
		const list = placement?.[tier.id] ?? [];
		out[tier.id] =
			fw.kind === 'ranked'
				? trimTrailingEmpty(
						list.slice(0, fw.slots).map((abbr) => (firstSighting(abbr) ? abbr : EMPTY_SLOT))
					)
				: list.filter(firstSighting);
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

/**
 * Put a team in rank slot `index` of a positional list. If the team was already in another
 * slot, the two swap; a team displaced by one coming from the pool goes back to the pool.
 */
export function placeInSlot(list: string[], index: number, abbr: string): string[] {
	const out = [...list];
	while (out.length <= index) out.push(EMPTY_SLOT);
	const from = out.indexOf(abbr);
	if (from === index) return trimTrailingEmpty(out);
	if (from >= 0) out[from] = out[index];
	out[index] = abbr;
	return trimTrailingEmpty(out);
}

/** Return teams to the pool (ranked slots they leave stay in place, empty). */
export function unplaceTeams(placement: Placement, abbrs: string[], fw: Framework): Placement {
	const removing = new Set(abbrs);
	return Object.fromEntries(
		Object.entries(placement).map(([id, list]) => [
			id,
			fw.kind === 'ranked'
				? trimTrailingEmpty(list.map((a) => (removing.has(a) ? EMPTY_SLOT : a)))
				: list.filter((a) => !removing.has(a))
		])
	);
}

export function placedTeams(placement: Placement): Set<string> {
	return new Set(Object.values(placement).flat().filter(Boolean));
}
