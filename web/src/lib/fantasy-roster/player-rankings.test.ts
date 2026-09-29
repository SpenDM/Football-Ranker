import { describe, expect, it } from 'vitest';
import type { FantasyPlayer, TeamFantasyStats } from '$lib/data/fantasy';
import {
	bestMatchups,
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

	it("adds the upcoming game to a player's breakdown, ranked by the matchup split", () => {
		const [rb1] = slotEntries(slot('RB'), players, teams, ranks);
		// Rushing PPR allowed: BUF 10, KC 20, DAL 25, NYJ 30.
		expect(rb1.breakdown).toEqual([
			{ week: 1, opponent: 'NYJ', home: true, score: 12, opponentRank: 4 },
			{ week: 2, opponent: 'NYJ', home: false, score: null, opponentRank: 4 }
		]);
		expect(rb1.opponentRankLabel).toBe('rushing defense rank');
	});
});

describe('bestMatchups', () => {
	it("adds the opponent's PPR allowed in the position's split to the player's average", () => {
		const rows = bestMatchups(slotEntries(slot('FLEX'), players, teams, ranks));
		// rb1: NYJ rush 30 + 12; rb2: DAL rush 25 + 20; wr1: NYJ pass 45 + 15. rb3 has no game left.
		expect(rows.map((r) => [r.rank, r.entry.id, r.score])).toEqual([
			[1, 'wr1', 60],
			[2, 'rb2', 45],
			[3, 'rb1', 42]
		]);
		expect(rows[0].detail).toBe('@ NYJ · 45.0 PA');
	});

	it('uses rushing + passing allowed for QBs', () => {
		const [qb] = bestMatchups(slotEntries(slot('QB'), players, teams, ranks));
		expect(qb.score).toBe(25 + 35 + 22);
	});

	it("ranks D/STs by defense rank minus the opponent's offense rank, lowest first", () => {
		const rows = bestMatchups(slotEntries(slot('DST'), players, teams, ranks), true);
		// DST ranks: KC 1, DAL 2, BUF 3, NYJ 4. Offense ranks: BUF 1, KC 2, DAL 3, NYJ 4.
		expect(rows.map((r) => [r.entry.id, r.score, r.scoreText])).toEqual([
			['DST-KC', -3, '−3'],
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
