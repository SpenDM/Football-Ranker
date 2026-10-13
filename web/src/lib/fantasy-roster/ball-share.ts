import type { BallShareEntry } from '$lib/data/fantasy';

/** Players under this share of their team's rushes + targets merge into one "Other" slice. */
export const OTHER_THRESHOLD = 0.03;

/** Slices at least this big get a name label on the pie (the rest show on hover). */
export const LABEL_THRESHOLD = 0.08;

/** Positions whose Player Rankings rows show Ball Share. */
export const BALL_SHARE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

export type ShareSlice = {
	/** Player id, or null for the merged "Other" slice. */
	id: string | null;
	/** Full name ("Other" for the merged slice). */
	name: string;
	/** Short name for the pie label, e.g. "P. Nacua". */
	label: string;
	position: string;
	rushes: number;
	targets: number;
	touches: number;
	/** Fraction of the team's rushes + targets, 0–1. */
	share: number;
	/** How many players the slice stands for (more than 1 only for "Other"). */
	players: number;
	/** The clicked player's slice. */
	highlight: boolean;
};

/** "Puka Nacua" → "P. Nacua"; "Amon-Ra St. Brown" → "A. St. Brown". */
export function shortName(name: string): string {
	const [first, ...rest] = name.trim().split(/\s+/);
	return rest.length ? `${first[0]}. ${rest.join(' ')}` : first;
}

/**
 * A team's ball share as pie slices, biggest first, with everyone under OTHER_THRESHOLD merged
 * into a final "Other" slice. The highlighted player always keeps a slice of their own, so it
 * can be picked out however small it is.
 */
export function ballShareSlices(players: BallShareEntry[], highlightId: string | null): ShareSlice[] {
	const total = players.reduce((sum, p) => sum + p.rushes + p.targets, 0);
	if (!total) return [];

	const slices: ShareSlice[] = [];
	const other: ShareSlice = {
		id: null,
		name: 'Other',
		label: 'Other',
		position: '',
		rushes: 0,
		targets: 0,
		touches: 0,
		share: 0,
		players: 0,
		highlight: false
	};
	const sorted = [...players].sort(
		(a, b) => b.rushes + b.targets - (a.rushes + a.targets) || a.name.localeCompare(b.name)
	);
	for (const p of sorted) {
		const touches = p.rushes + p.targets;
		const share = touches / total;
		const highlight = p.id === highlightId;
		if (share >= OTHER_THRESHOLD || highlight) {
			slices.push({
				id: p.id,
				name: p.name,
				label: shortName(p.name),
				position: p.position,
				rushes: p.rushes,
				targets: p.targets,
				touches,
				share,
				players: 1,
				highlight
			});
		} else {
			other.rushes += p.rushes;
			other.targets += p.targets;
			other.touches += touches;
			other.share += share;
			other.players += 1;
		}
	}
	if (other.players) slices.push(other);
	return slices;
}
