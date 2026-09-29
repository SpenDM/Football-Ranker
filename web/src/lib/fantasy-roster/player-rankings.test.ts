import { describe, expect, it } from 'vitest';
import type { FantasyPlayer, TeamFantasyStats } from '$lib/data/fantasy';
import {
	bestMatchups,
	matchupFactor,
	renumber,
	searchEntries,
	slotEntries,
	SLOTS,
	topPerformers
} from './player-rankings';
import { rankIndex } from './team-rankings';

function team(
	abbr: string,
	{ offense = 0, dst = 0, rush = 0, pass = 0 } = {},
	nextGame: TeamFantasyStats['nextGame'] = null
): TeamFantasyStats {
	return {
		abbr,
		games: 2,
		offense: {
			total: offense,
			rush: 0,
			pass: 0,
			yardsPerGame: 0,
			pointsPerGame: 0,
			rushYardsPerGame: 0,
			rushTdsPerGame: 0,
			passYardsPerGame: 0,
			passTdsPerGame: 0
		},
		defense: {
			total: dst,
			rush,
			pass,
			sacksPerGame: 0,
			takeawaysPerGame: 0,
			pointsAllowedPerGame: 0
		},
		gameLog: [],
		nextGame
	};
}

function player(
	id: string,
	position: FantasyPlayer['position'],
	teamAbbr: string,
	average: number
): FantasyPlayer {
	return {
		id,
		name: `Player ${id}`,
		position,
		team: teamAbbr,
		games: 1,
		total: average,
		average,
		gameLog: [{ week: 1, opponent: 'NYJ', home: true, points: average }]
	};
}

// KC plays at NYJ next; BUF hosts DAL; DAL and NYJ have no games left.
const teams = [
	team(
		'KC',
		{ offense: 500, dst: 9, rush: 20, pass: 40 },
		{ week: 2, opponent: 'NYJ', home: false }
	),
	team(
		'BUF',
		{ offense: 600, dst: 5, rush: 10, pass: 30 },
		{ week: 2, opponent: 'DAL', home: true }
	),
	team('DAL', { offense: 400, dst: 7, rush: 25, pass: 35 }),
	team('NYJ', { offense: 300, dst: 3, rush: 30, pass: 45 })
];
const ranks = rankIndex(teams);
const slot = (id: string) => SLOTS.find((s) => s.id === id)!;

const players = [
	player('rb1', 'RB', 'KC', 12),
	player('rb2', 'RB', 'BUF', 20),
	player('rb3', 'RB', 'DAL', 30),
	player('wr1', 'WR', 'KC', 15),
	player('qb1', 'QB', 'BUF', 22)
];

describe('slotEntries', () => {
	it('fills FLEX with RBs and WRs', () => {
		const ids = slotEntries(slot('FLEX'), players, teams, ranks).map((e) => e.id);
		expect(ids).toEqual(['rb1', 'rb2', 'rb3', 'wr1']);
	});

	it("adds missed games and the upcoming game to a player's breakdown", () => {
		const zero = { total: 0, rush: 0, pass: 0 };
		const game = (week: number, opponent: string, home: boolean) => ({
			week,
			opponent,
			home,
			offense: zero,
			defense: zero
		});
		// KC played NYJ in week 1 (with rb1) and BUF in week 2 (without), then plays DAL.
		const kc = {
			...teams[0],
			gameLog: [game(1, 'NYJ', true), game(2, 'BUF', false)],
			nextGame: { week: 3, opponent: 'DAL', home: true }
		};
		const [rb1] = slotEntries(slot('RB'), players, [kc, ...teams.slice(1)], ranks);
		// Rushing PPR allowed: BUF 10, KC 20, DAL 25, NYJ 30.
		expect(rb1.breakdown).toEqual([
			{ week: 1, opponent: 'NYJ', home: true, score: 12, opponentRank: 4 },
			{ week: 2, opponent: 'BUF', home: false, score: null, didNotPlay: true, opponentRank: 1 },
			{ week: 3, opponent: 'DAL', home: true, score: null, opponentRank: 3 }
		]);
		expect(rb1.opponentRankLabel).toBe('rushing defense rank');
		// The week 2 DNP is recent, so rb1 averages (12 + 0) / 2 for the matchup (× DAL rush #3).
		expect(rb1.matchup?.score).toBeCloseTo(6 * (0.6 + 1.6 / 3));
		expect(rb1.average).toBe(12);

		// Once week 2 is more than 3 weeks back, the DNP no longer counts.
		const nyj = { ...teams[3], gameLog: [game(5, 'BUF', true)] };
		const [later] = slotEntries(slot('RB'), players, [kc, ...teams.slice(1, 3), nyj], ranks);
		expect(later.matchup?.score).toBeCloseTo(12 * (0.6 + 1.6 / 3));
	});
});

describe('matchupFactor', () => {
	it('scales rank 1 to 0.6 and the last rank to 1.4', () => {
		expect(matchupFactor(1)).toBeCloseTo(0.6);
		expect(matchupFactor(32)).toBeCloseTo(1.4);
		expect(matchupFactor(16.5)).toBeCloseTo(1);
	});
});

describe('bestMatchups', () => {
	// With 4 teams, ranks 1-4 scale to ×0.6, ×0.867, ×1.133, ×1.4.
	it("multiplies the player's average by the opponent's scaled rank in the position's split", () => {
		const rows = bestMatchups(slotEntries(slot('FLEX'), players, teams, ranks));
		// rb2: 20 × DAL rush #3; wr1: 15 × NYJ pass #4; rb1: 12 × NYJ rush #4. rb3 has no game left.
		expect(rows.map((r) => [r.rank, r.entry.id, r.score.toFixed(2)])).toEqual([
			[1, 'rb2', '22.67'],
			[2, 'wr1', '21.00'],
			[3, 'rb1', '16.80']
		]);
		expect(rows[1].detail).toBe('@ NYJ · #4 · ×1.40');
	});

	it('ranks QB matchups by rushing + passing allowed', () => {
		// Total allowed: BUF 40, DAL 60, KC 60, NYJ 75, so DAL is #2 (ties go alphabetically).
		const [qb] = bestMatchups(slotEntries(slot('QB'), players, teams, ranks));
		expect(qb.score).toBeCloseTo(22 * (0.6 + 0.8 / 3));
	});

	it("ranks D/STs by the opponent's offense rank minus the defense rank, highest first", () => {
		const rows = bestMatchups(slotEntries(slot('DST'), players, teams, ranks));
		// DST ranks: KC 1, DAL 2, BUF 3, NYJ 4. Offense ranks: BUF 1, KC 2, DAL 3, NYJ 4.
		expect(rows.map((r) => [r.entry.id, r.score, r.scoreText])).toEqual([
			['DST-KC', 3, '3'],
			['DST-BUF', 0, '0']
		]);
		expect(rows[0].entry.name).toBe('Chiefs D/ST');
		expect(rows[0].detail).toBe('@ NYJ · #1 v #4');
	});

	it('renumbers once unavailable players are removed', () => {
		const rows = bestMatchups(slotEntries(slot('RB'), players, teams, ranks));
		expect(
			renumber(rows.filter((r) => r.entry.id !== 'rb2')).map((r) => [r.rank, r.entry.id])
		).toEqual([[1, 'rb1']]);
	});
});

describe('topPerformers', () => {
	it('ranks by points per game, showing the position in FLEX', () => {
		const rows = topPerformers(slotEntries(slot('FLEX'), players, teams, ranks), true);
		expect(rows.map((r) => r.entry.id)).toEqual(['rb3', 'rb2', 'wr1', 'rb1']);
		expect(rows[0].detail).toBe('RB · 1 G');
	});
});

describe('searchEntries', () => {
	it('matches player names and D/ST cities', () => {
		const flex = slotEntries(slot('FLEX'), players, teams, ranks);
		expect(searchEntries('rb', flex).map((e) => e.id)).toEqual(['rb3', 'rb2', 'rb1']);
		const dst = slotEntries(slot('DST'), players, teams, ranks);
		expect(searchEntries('kansas', dst).map((e) => e.id)).toEqual(['DST-KC']);
		expect(searchEntries(' ', dst)).toEqual([]);
	});
});
