export type Tier = {
	id: string;
	label: string;
	color: string;
};

export type FrameworkKind = 'ranked' | 'tiered';

export type Framework = {
	id: string;
	name: string;
	kind: FrameworkKind;
	/** Ranked frameworks have exactly one tier holding the ordered list. */
	tiers: Tier[];
	/** Number of rank slots (ranked frameworks only). */
	slots: number;
	updatedAt: number;
	/** Local-only: uid of the account a custom framework is synced to (null = guest). */
	owner?: string | null;
};

/** Team abbreviations per tier id, in display order. Unlisted teams are in the pool. */
export type Placement = Record<string, string[]>;
