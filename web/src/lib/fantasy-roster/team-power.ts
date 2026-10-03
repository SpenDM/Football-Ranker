import type { TeamFantasyStats } from '$lib/data/fantasy';

export const REGULAR_SEASON_WEEKS = 18;

/**
 * How much a game's point differential counts, by the opponent's rank going into the game:
 * a win counts 1.5× against #1 down to 0.5× against the last-ranked team, and a loss the
 * reverse (0.5× against #1 up to 1.5× against the last-ranked team).
 */
export function opponentModifier(opponentRank: number, margin: number, teamCount = 32): number {
	// 1 for the top-ranked opponent, 0 for the bottom.
	const strength = (teamCount - opponentRank) / (teamCount - 1);
	return margin > 0 ? 0.5 + strength : 1.5 - strength;
}

export type PowerGame = {
	opponent: string;
	home: boolean;
	outcome: 'W' | 'L' | 'T';
	pointsFor: number;
	pointsAgainst: number;
	/** The opponent's power rank going into the game. */
	opponentRank: number;
	/** Ranking points gained (or lost): point differential × opponent modifier. */
	change: number;
};

export type PowerEntry = {
	abbr: string;
	rank: number;
	/** Total ranking points going into the week. */
	points: number;
	/** Rank by ranking points alone. */
	pointsRank: number;
	/** Overall offense and defense ranks from games before this week (null before any games). */
	offenseRank: number | null;
	defenseRank: number | null;
	/** Power score: half the points rank, half the average of the offense and defense ranks
	 *  (lower is better). */
	score: number;
	/** The week's game, once the week is over (null for a bye or a week still to come). */
	game: PowerGame | null;
};

export type PowerWeek = {
	week: number;
	/** Teams best first going into the week, or null for a week not reached yet. */
	entries: PowerEntry[] | null;
	/** Whether the week's games are all in (so its games count toward the next week). */
	complete: boolean;
};

/**
 * Overall offense or defense rank of each team from its games before `week` (per-game average,
 * higher is better, ties alphabetical). Teams with no games yet are left out.
 */
export function unitRanksBefore(
	teams: TeamFantasyStats[],
	unit: 'offense' | 'defense',
	week: number
): Map<string, number> {
	const averages = teams.flatMap((t) => {
		const played = t.gameLog.filter((g) => g.week < week);
		if (!played.length) return [];
		const avg = played.reduce((sum, g) => sum + g[unit].total, 0) / played.length;
		return [{ abbr: t.abbr, avg }];
	});
	averages.sort((a, b) => b.avg - a.avg || a.abbr.localeCompare(b.abbr));
	return new Map(averages.map((a, i) => [a.abbr, i + 1]));
}

/**
 * Power rankings going into each regular-season week.
 *
 * Ranking points: week 1 is the reverse of the draft order (the last pick ranks first), with
 * each team starting on points equal to its reversed rank (32 for #1 down to 1 for #32). After
 * each completed week, teams add the ranking points from that week's game.
 *
 * Power rank: teams are ordered by a score that's half their rank by ranking points and half the
 * average of their overall offense and defense ranks from games so far (lower is better). A team
 * with no games yet uses its points rank for both halves. Ties go to the better points rank,
 * then the previous week's order. Opponent modifiers use the power rank.
 */
export function weeklyPowerRankings(
	teams: TeamFantasyStats[],
	draftOrder: string[],
	lastCompleteWeek: number
): PowerWeek[] {
	const games = new Map(teams.map((t) => [t.abbr, new Map(t.gameLog.map((g) => [g.week, g]))]));
	/** Order by ranking points alone (ties keep the previous order). */
	let pointsOrder = [...draftOrder].reverse();
	/** Power order from the previous week, for breaking ties. */
	let order = pointsOrder;
	const points = new Map(pointsOrder.map((abbr, i) => [abbr, pointsOrder.length - i]));
	const weeks: PowerWeek[] = [];

	for (let week = 1; week <= REGULAR_SEASON_WEEKS; week++) {
		if (week > lastCompleteWeek + 1) {
			weeks.push({ week, entries: null, complete: false });
			continue;
		}
		const complete = week <= lastCompleteWeek;

		const pointsRankOf = new Map(pointsOrder.map((abbr, i) => [abbr, i + 1]));
		const offenseRanks = unitRanksBefore(teams, 'offense', week);
		const defenseRanks = unitRanksBefore(teams, 'defense', week);
		const previousRank = new Map(order.map((abbr, i) => [abbr, i]));
		const scored = pointsOrder.map((abbr) => {
			const pointsRank = pointsRankOf.get(abbr)!;
			const offenseRank = offenseRanks.get(abbr) ?? null;
			const defenseRank = defenseRanks.get(abbr) ?? null;
			const unitAverage =
				offenseRank !== null && defenseRank !== null ? (offenseRank + defenseRank) / 2 : pointsRank;
			return {
				abbr,
				pointsRank,
				offenseRank,
				defenseRank,
				score: (pointsRank + unitAverage) / 2
			};
		});
		scored.sort(
			(a, b) =>
				a.score - b.score ||
				a.pointsRank - b.pointsRank ||
				previousRank.get(a.abbr)! - previousRank.get(b.abbr)!
		);
		order = scored.map((s) => s.abbr);

		const rankOf = new Map(order.map((abbr, i) => [abbr, i + 1]));
		const entries = scored.map(({ abbr, ...parts }, i): PowerEntry => {
			const g = complete ? games.get(abbr)?.get(week) : undefined;
			let game: PowerGame | null = null;
			if (g) {
				const margin = g.pointsFor - g.pointsAgainst;
				const opponentRank = rankOf.get(g.opponent) ?? order.length;
				game = {
					opponent: g.opponent,
					home: g.home,
					outcome: margin > 0 ? 'W' : margin < 0 ? 'L' : 'T',
					pointsFor: g.pointsFor,
					pointsAgainst: g.pointsAgainst,
					opponentRank,
					change: margin * opponentModifier(opponentRank, margin, order.length)
				};
			}
			return {
				abbr,
				rank: i + 1,
				points: points.get(abbr) ?? 0,
				...parts,
				game
			};
		});
		weeks.push({ week, entries, complete });

		if (complete) {
			for (const e of entries) points.set(e.abbr, e.points + (e.game?.change ?? 0));
			// Array sort is stable, so teams tied on points keep this week's points order.
			pointsOrder = [...pointsOrder].sort((a, b) => points.get(b)! - points.get(a)!);
		}
	}
	return weeks;
}
