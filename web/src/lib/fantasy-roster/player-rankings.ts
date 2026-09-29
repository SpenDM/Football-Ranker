import type { FantasyPlayer, PlayerPosition, TeamFantasyStats } from '$lib/data/fantasy';
import { teamsByAbbr } from '$lib/data/teams';
import { gameBreakdown, type GameBreakdown, type RankIndex, type Split } from './team-rankings';

export type SlotId = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DST' | 'K';

/** A fantasy roster slot and the positions that can fill it (none for D/ST, which is a team). */
export type Slot = {
	id: SlotId;
	label: string;
	positions: PlayerPosition[];
	/** How the matchup score is calculated, shown above the lists. */
	formula: string;
};

const playerFormula = (allowed: string) =>
	`Matchup score: the opponent's ${allowed} PPR points allowed per game (PA) plus the player's points per game.`;

export const SLOTS: Slot[] = [
	{
		id: 'QB',
		label: 'QB',
		positions: ['QB'],
		formula: playerFormula('rushing + passing')
	},
	{
		id: 'RB',
		label: 'RB',
		positions: ['RB'],
		formula: playerFormula('rushing')
	},
	{
		id: 'WR',
		label: 'WR',
		positions: ['WR'],
		formula: playerFormula('passing')
	},
	{
		id: 'TE',
		label: 'TE',
		positions: ['TE'],
		formula: playerFormula('passing')
	},
	{
		id: 'FLEX',
		label: 'FLEX',
		positions: ['RB', 'WR'],
		formula: playerFormula('rushing (for RBs) or passing (for WRs)')
	},
	{
		id: 'DST',
		label: 'D/ST',
		positions: [],
		formula:
			"Matchup score: this defense's overall rank minus the opponent's overall offense rank (#D v #O; lower is better)."
	},
	{
		id: 'K',
		label: 'K',
		positions: ['K'],
		formula: playerFormula('rushing + passing')
	}
];

/** Which defense split a position's matchups are judged by. */
export const MATCHUP_SPLIT: Record<PlayerPosition, Split> = {
	QB: 'total',
	RB: 'rush',
	WR: 'pass',
	TE: 'pass',
	K: 'total'
};

/** A player (or a D/ST) in a slot's lists. */
export type PlayerEntry = {
	/** Player id, or "DST-<team>" for a D/ST. */
	id: string;
	name: string;
	/** Team abbreviation. */
	team: string;
	/** "QB" … "K", or "D/ST". */
	position: string;
	games: number;
	/** Fantasy points per game played. */
	average: number;
	/** Game-by-game points, then the upcoming game (without a score). */
	breakdown: GameBreakdown[];
	/** What each breakdown row's opponent rank is in, e.g. "rushing defense rank". */
	opponentRankLabel: string;
	/** The upcoming game's matchup, or null if the team has no games left. */
	matchup: Matchup | null;
};

/** Higher is better for players; for a D/ST, lower is better. */
export type Matchup = {
	opponent: string;
	home: boolean;
	score: number;
	detail: string;
};

/** A row in one of a slot's lists. */
export type RankedPlayer = {
	entry: PlayerEntry;
	rank: number;
	score: number;
	scoreText: string;
	detail: string;
};

/** Fantasy points a defense allows per game in a split; "total" is rushing plus passing. */
export function pointsAllowed(team: TeamFantasyStats, split: Split): number {
	return split === 'total' ? team.defense.rush + team.defense.pass : team.defense[split];
}

/** Every defense's rank by fantasy points allowed in each split (1 = fewest allowed). */
export function allowedRanks(teams: TeamFantasyStats[]): Record<Split, Map<string, number>> {
	const rank = (split: Split) =>
		new Map(
			[...teams]
				.sort(
					(a, b) =>
						pointsAllowed(a, split) - pointsAllowed(b, split) || a.abbr.localeCompare(b.abbr)
				)
				.map((t, i) => [t.abbr, i + 1])
		);
	return { total: rank('total'), rush: rank('rush'), pass: rank('pass') };
}

const SPLIT_NAMES: Record<Split, string> = {
	total: 'overall defense rank (PPR allowed)',
	rush: 'rushing defense rank',
	pass: 'passing defense rank'
};

const vsOrAt = (home: boolean) => (home ? 'vs' : '@');

export function playerEntry(
	player: FantasyPlayer,
	teams: Map<string, TeamFantasyStats>,
	allowed: Record<Split, Map<string, number>>
): PlayerEntry {
	const split = MATCHUP_SPLIT[player.position];
	const opponentRank = allowed[split];
	const breakdown: GameBreakdown[] = player.gameLog.map((g) => ({
		week: g.week,
		opponent: g.opponent,
		home: g.home,
		score: g.points,
		opponentRank: opponentRank.get(g.opponent)
	}));

	const next = teams.get(player.team)?.nextGame;
	const opponent = next && teams.get(next.opponent);
	let matchup: Matchup | null = null;
	if (next && opponent) {
		breakdown.push({
			...next,
			score: null,
			opponentRank: opponentRank.get(next.opponent)
		});
		const oppAllowed = pointsAllowed(opponent, split);
		matchup = {
			opponent: next.opponent,
			home: next.home,
			score: oppAllowed + player.average,
			detail: `${vsOrAt(next.home)} ${next.opponent} · ${oppAllowed.toFixed(1)} PA`
		};
	}

	return {
		id: player.id,
		name: player.name,
		team: player.team,
		position: player.position,
		games: player.games,
		average: player.average,
		breakdown,
		opponentRankLabel: SPLIT_NAMES[split],
		matchup
	};
}

/** A team's D/ST: its overall defense rank minus its next opponent's overall offense rank. */
export function dstEntry(
	team: TeamFantasyStats,
	teams: Map<string, TeamFantasyStats>,
	ranks: RankIndex
): PlayerEntry {
	const next = team.nextGame;
	let matchup: Matchup | null = null;
	if (next && teams.has(next.opponent)) {
		const defenseRank = ranks.defense.total.get(team.abbr) ?? 0;
		const offenseRank = ranks.offense.total.get(next.opponent) ?? 0;
		matchup = {
			opponent: next.opponent,
			home: next.home,
			score: defenseRank - offenseRank,
			detail: `${vsOrAt(next.home)} ${next.opponent} · #${defenseRank} v #${offenseRank}`
		};
	}
	return {
		id: `DST-${team.abbr}`,
		name: `${teamsByAbbr.get(team.abbr)?.nickname ?? team.abbr} D/ST`,
		team: team.abbr,
		position: 'D/ST',
		games: team.games,
		average: team.defense.total,
		breakdown: gameBreakdown(team, 'defense', 'total', ranks),
		opponentRankLabel: 'overall offense rank',
		matchup
	};
}

/** Everyone who can fill a slot. */
export function slotEntries(
	slot: Slot,
	players: FantasyPlayer[],
	teamStats: TeamFantasyStats[],
	ranks: RankIndex
): PlayerEntry[] {
	const teams = new Map(teamStats.map((t) => [t.abbr, t]));
	if (slot.id === 'DST') return teamStats.map((t) => dstEntry(t, teams, ranks));
	const allowed = allowedRanks(teamStats);
	return players
		.filter((p) => slot.positions.includes(p.position))
		.map((p) => playerEntry(p, teams, allowed));
}

const games = (e: PlayerEntry) => `${e.games} G`;

/** Best points per game first; ties are broken by name. */
export function topPerformers(entries: PlayerEntry[], showPosition = false): RankedPlayer[] {
	return [...entries]
		.sort((a, b) => b.average - a.average || a.name.localeCompare(b.name))
		.map((entry, i) => ({
			entry,
			rank: i + 1,
			score: entry.average,
			scoreText: entry.average.toFixed(1),
			detail: showPosition ? `${entry.position} · ${games(entry)}` : games(entry)
		}));
}

/** Players with an upcoming game, best matchup first (highest score; lowest for a D/ST). */
export function bestMatchups(entries: PlayerEntry[], lowerIsBetter = false): RankedPlayer[] {
	const direction = lowerIsBetter ? 1 : -1;
	return entries
		.filter((e): e is PlayerEntry & { matchup: Matchup } => e.matchup !== null)
		.sort(
			(a, b) =>
				direction * (a.matchup.score - b.matchup.score) ||
				b.average - a.average ||
				a.name.localeCompare(b.name)
		)
		.map((entry, i) => ({
			entry,
			rank: i + 1,
			score: entry.matchup.score,
			scoreText: lowerIsBetter
				? String(entry.matchup.score).replace('-', '−')
				: entry.matchup.score.toFixed(1),
			detail: entry.matchup.detail
		}));
}

/** Re-number a filtered list from 1. */
export function renumber(rows: RankedPlayer[]): RankedPlayer[] {
	return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Entries whose name matches the query (case-insensitive); for a D/ST, the team's city also
 * matches. Names with a word starting with the query come first.
 */
export function searchEntries(query: string, entries: PlayerEntry[], limit = 8): PlayerEntry[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const text = (e: PlayerEntry) =>
		(e.position === 'D/ST'
			? `${teamsByAbbr.get(e.team)?.name ?? e.team} D/ST`
			: e.name
		).toLowerCase();
	const wordStarts = (e: PlayerEntry) =>
		text(e)
			.split(/[\s.'-]+/)
			.some((w) => w.startsWith(q));
	return entries
		.filter((e) => text(e).includes(q))
		.sort(
			(a, b) =>
				Number(wordStarts(b)) - Number(wordStarts(a)) ||
				b.average - a.average ||
				a.name.localeCompare(b.name)
		)
		.slice(0, limit);
}
