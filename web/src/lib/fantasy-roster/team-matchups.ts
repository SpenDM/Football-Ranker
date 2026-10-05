import type { TeamFantasyStats } from '$lib/data/fantasy';
import type { RankIndex } from './team-rankings';
import { gameInWeek, resolveWeek } from './schedule';

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
 * The games of a week still to play (NFL weeks run Thursday through Monday, as nflverse numbers
 * them), better team first, most lopsided first, and the teams on bye. The week is the chosen
 * one, or by default the earliest with a game still to play, so it's null once the season is
 * over. Ranks are the season so far, whichever week is shown.
 */
export function upcomingMatchups(
	teams: TeamFantasyStats[],
	ranks: RankIndex,
	chosenWeek: number | null = null
): { week: number | null; games: TeamMatchup[]; byes: string[] } {
	const week = resolveWeek(teams, chosenWeek);
	if (week === null) return { week: null, games: [], byes: [] };

	const side = (abbr: string, home: boolean): MatchupSide => ({
		abbr,
		home,
		offenseRank: ranks.offense.total.get(abbr) ?? teams.length,
		defenseRank: ranks.defense.total.get(abbr) ?? teams.length
	});

	const games: TeamMatchup[] = [];
	const byes: string[] = [];
	for (const t of teams) {
		const next = gameInWeek(t, week);
		if (!next) byes.push(t.abbr);
		// Each game once, from the home team's side.
		if (!next?.home) continue;
		const home = side(t.abbr, true);
		const away = side(next.opponent, false);
		const diff = rankTotal(home) - rankTotal(away);
		// Ties list the home team first.
		const [better, worse] = diff <= 0 ? [home, away] : [away, home];
		games.push({ better, worse, score: Math.abs(diff) });
	}
	games.sort((a, b) => b.score - a.score || a.better.abbr.localeCompare(b.better.abbr));
	return { week, games, byes: byes.sort() };
}

export type GameResult = {
	week: number;
	opponent: string;
	home: boolean;
	/** Null for the upcoming game. */
	result: { outcome: 'W' | 'L' | 'T'; pointsFor: number; pointsAgainst: number } | null;
};

/** A team's results game by game, followed by its game in `week` (its next game by default),
 *  without a result. */
export function gameResults(team: TeamFantasyStats, week: number | null = null): GameResult[] {
	const played: GameResult[] = team.gameLog.map((g) => ({
		week: g.week,
		opponent: g.opponent,
		home: g.home,
		result: {
			outcome: g.pointsFor > g.pointsAgainst ? 'W' : g.pointsFor < g.pointsAgainst ? 'L' : 'T',
			pointsFor: g.pointsFor,
			pointsAgainst: g.pointsAgainst
		}
	}));
	const next = gameInWeek(team, week);
	return next ? [...played, { ...next, result: null }] : played;
}
