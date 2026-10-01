import type { TeamFantasyStats } from '$lib/data/fantasy';
import type { RankIndex } from './team-rankings';

export type MatchupSide = {
	abbr: string;
	home: boolean;
	/** Overall offense rank (1 is best). */
	offenseRank: number;
	/** Overall defense rank (1 is best). */
	defenseRank: number;
};

export type TeamMatchup = {
	/** The team with the lower (better) offense + defense rank total. */
	better: MatchupSide;
	worse: MatchupSide;
	/** How many rank places separate the two teams: the difference in offense + defense rank. */
	score: number;
};

const rankTotal = (side: MatchupSide) => side.offenseRank + side.defenseRank;

/**
 * The games of the upcoming week (NFL weeks run Thursday through Monday, as nflverse numbers
 * them), better team first, most lopsided first. The week is the earliest one with a game
 * still to play, so it's null once the season is over.
 */
export function upcomingMatchups(
	teams: TeamFantasyStats[],
	ranks: RankIndex
): { week: number | null; games: TeamMatchup[] } {
	const weeks = teams.flatMap((t) => (t.nextGame ? [t.nextGame.week] : []));
	if (!weeks.length) return { week: null, games: [] };
	const week = Math.min(...weeks);

	const side = (abbr: string, home: boolean): MatchupSide => ({
		abbr,
		home,
		offenseRank: ranks.offense.total.get(abbr) ?? teams.length,
		defenseRank: ranks.defense.total.get(abbr) ?? teams.length
	});

	const games: TeamMatchup[] = [];
	for (const t of teams) {
		const next = t.nextGame;
		// Each game once, from the home team's side.
		if (next?.week !== week || !next.home) continue;
		const home = side(t.abbr, true);
		const away = side(next.opponent, false);
		const diff = rankTotal(home) - rankTotal(away);
		// Ties list the home team first.
		const [better, worse] = diff <= 0 ? [home, away] : [away, home];
		games.push({ better, worse, score: Math.abs(diff) });
	}
	games.sort((a, b) => b.score - a.score || a.better.abbr.localeCompare(b.better.abbr));
	return { week, games };
}
