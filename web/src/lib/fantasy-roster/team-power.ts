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
 * Power rankings going into each regular-season week. Week 1 is the reverse of the draft order
 * (the last pick ranks first), with each team starting on ranking points equal to its reversed
 * rank (32 for #1 down to 1 for #32). After each completed week, teams add their ranking points
 * from that week's game and are re-ranked by total, ties keeping the previous week's order.
 */
export function weeklyPowerRankings(
	teams: TeamFantasyStats[],
	draftOrder: string[],
	lastCompleteWeek: number
): PowerWeek[] {
	const games = new Map(teams.map((t) => [t.abbr, new Map(t.gameLog.map((g) => [g.week, g]))]));
	let order = [...draftOrder].reverse();
	const points = new Map(order.map((abbr, i) => [abbr, order.length - i]));
	const weeks: PowerWeek[] = [];

	for (let week = 1; week <= REGULAR_SEASON_WEEKS; week++) {
		if (week > lastCompleteWeek + 1) {
			weeks.push({ week, entries: null, complete: false });
			continue;
		}
		const complete = week <= lastCompleteWeek;
		const rankOf = new Map(order.map((abbr, i) => [abbr, i + 1]));
		const entries = order.map((abbr, i): PowerEntry => {
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
			return { abbr, rank: i + 1, points: points.get(abbr) ?? 0, game };
		});
		weeks.push({ week, entries, complete });

		if (complete) {
			for (const e of entries) points.set(e.abbr, e.points + (e.game?.change ?? 0));
			// Array sort is stable, so tied teams keep this week's order.
			order = [...order].sort((a, b) => points.get(b)! - points.get(a)!);
		}
	}
	return weeks;
}
