import { describe, expect, it } from 'vitest';
import { fantasyTeams, type GameLogEntry, type TeamFantasyStats } from '$lib/data/fantasy';
import {
	opponentModifier,
	REGULAR_SEASON_WEEKS,
	unitRanksBefore,
	weeklyPowerRankings
} from './team-power';

describe('opponentModifier', () => {
	it('scales a win from 1.5× against #1 to 0.5× against #32, and a loss the reverse', () => {
		expect(opponentModifier(1, 7)).toBe(1.5);
		expect(opponentModifier(32, 7)).toBe(0.5);
		expect(opponentModifier(1, -7)).toBe(0.5);
		expect(opponentModifier(32, -7)).toBe(1.5);
		expect(opponentModifier(16, 3)).toBeCloseTo(1.0161, 4);
	});
});

function team(
	abbr: string,
	games: [
		week: number,
		opponent: string,
		pf: number,
		pa: number,
		offense?: number,
		defense?: number
	][]
) {
	const gameLog: GameLogEntry[] = games.map(
		([week, opponent, pointsFor, pointsAgainst, offense = 0, defense = 0]) => ({
			week,
			opponent,
			home: true,
			pointsFor,
			pointsAgainst,
			offense: { total: offense, rush: 0, pass: 0 },
			defense: { total: defense, rush: 0, pass: 0 }
		})
	);
	return { abbr, gameLog } as TeamFantasyStats;
}

describe('unitRanksBefore', () => {
	it('ranks per-game averages from earlier weeks only, leaving out teams without games', () => {
		const teams = [
			team('A', [
				[1, 'B', 0, 0, 300, 5],
				[2, 'B', 0, 0, 100, 5]
			]),
			team('B', [
				[1, 'A', 0, 0, 250, 9],
				[2, 'A', 0, 0, 900, 9]
			]),
			team('C', [])
		];
		expect([...unitRanksBefore(teams, 'offense', 2)]).toEqual([
			['A', 1],
			['B', 2]
		]);
		expect([...unitRanksBefore(teams, 'offense', 3)]).toEqual([
			['B', 1],
			['A', 2]
		]);
		expect([...unitRanksBefore(teams, 'defense', 3)]).toEqual([
			['B', 1],
			['A', 2]
		]);
		expect(unitRanksBefore(teams, 'offense', 1).size).toBe(0);
	});
});

describe('weeklyPowerRankings', () => {
	// Week 1: NYJ beat #1 BUF by 10; KC and MIA tied. Week 2: KC beat BUF by 10; NYJ and MIA had byes.
	// The last two numbers are each game's overall offense and defense scores.
	const teams = [
		team('BUF', [
			[1, 'NYJ', 10, 20, 300, 5],
			[2, 'KC', 20, 30, 500, 20]
		]),
		team('KC', [
			[1, 'MIA', 17, 17, 400, 10],
			[2, 'BUF', 30, 20, 200, 4]
		]),
		team('MIA', [[1, 'KC', 17, 17, 350, 8]]),
		team('NYJ', [[1, 'BUF', 20, 10, 250, 12]])
	];
	const draftOrder = ['NYJ', 'MIA', 'KC', 'BUF'];
	const ranked = (entries: { abbr: string }[] | null) => entries?.map((e) => e.abbr);

	it('blends the ranking-points rank with the offense and defense ranks', () => {
		const weeks = weeklyPowerRankings(teams, draftOrder, 2);
		expect(weeks).toHaveLength(REGULAR_SEASON_WEEKS);
		// Week 1 has no games yet, so it's the points order alone: reverse draft order, with
		// starting ranking points equal to the reversed rank (4 for #1 down to 1 for #4).
		expect(weeks[0].entries!.map((e) => [e.abbr, e.rank, e.points, e.score])).toEqual([
			['BUF', 1, 4, 1],
			['KC', 2, 3, 2],
			['MIA', 3, 2, 3],
			['NYJ', 4, 1, 4]
		]);
		expect(weeks[0].entries![0]).toMatchObject({
			offenseRank: null,
			defenseRank: null
		});

		const [buf, kc, , nyj] = weeks[0].entries!;
		// A 10-point win over #1 counts 1.5×; a 10-point loss to #4 (last) counts 1.5×.
		expect(nyj.game).toMatchObject({
			opponent: 'BUF',
			outcome: 'W',
			opponentRank: 1,
			change: 15
		});
		expect(buf.game).toMatchObject({
			outcome: 'L',
			opponentRank: 4,
			change: -15
		});
		expect(kc.game).toMatchObject({ outcome: 'T', change: 0 });

		// Points rank NYJ, KC, MIA, BUF. Offense KC, MIA, BUF, NYJ; defense NYJ, KC, MIA, BUF.
		// NYJ and KC tie on 1.75 and the better points rank goes first.
		expect(
			weeks[1].entries!.map((e) => [
				e.abbr,
				e.rank,
				e.points,
				e.pointsRank,
				e.offenseRank,
				e.defenseRank,
				e.score
			])
		).toEqual([
			['NYJ', 1, 16, 1, 4, 1, 1.75],
			['KC', 2, 3, 2, 1, 2, 1.75],
			['MIA', 3, 2, 3, 2, 3, 2.75],
			['BUF', 4, -11, 4, 3, 4, 3.75]
		]);
		const week2 = new Map(weeks[1].entries!.map((e) => [e.abbr, e]));
		// A 10-point win over #4 counts 0.5×; a 10-point loss to #2 counts 1.5 - 2/3.
		expect(week2.get('KC')!.game!.change).toBe(5);
		expect(week2.get('BUF')!.game!.change).toBeCloseTo(-8.333, 3);
		expect(week2.get('NYJ')!.game).toBeNull();

		// BUF is last on points but leads offense and defense over two games.
		expect(weeks[2].complete).toBe(false);
		expect(weeks[2].entries!.map((e) => [e.abbr, e.score, e.game])).toEqual([
			['NYJ', 2, null],
			['BUF', 2.5, null],
			['KC', 2.75, null],
			['MIA', 2.75, null]
		]);
		expect(weeks[2].entries![2].points).toBe(8);
		expect(weeks.slice(3).every((w) => w.entries === null)).toBe(true);
	});

	it('keeps the previous order for teams tied on ranking points', () => {
		// 5 teams start on 5..1. #5 E beats #3 C by 1 (1× either way against the middle team):
		// E reaches 2, level with D (bye), and D stays ahead on points; C drops to 1.5.
		const five = [team('C', [[1, 'E', 10, 11]]), team('E', [[1, 'C', 11, 10]])];
		const weeks = weeklyPowerRankings(five, ['E', 'D', 'C', 'B', 'A'], 1);
		const byPoints = [...weeks[1].entries!].sort((a, b) => a.pointsRank - b.pointsRank);
		expect(byPoints.map((e) => [e.abbr, e.points])).toEqual([
			['A', 5],
			['B', 4],
			['D', 2],
			['E', 2],
			['C', 1.5]
		]);
	});

	it("ignores an incomplete week's games", () => {
		const weeks = weeklyPowerRankings(teams, draftOrder, 0);
		expect(weeks[0]).toMatchObject({ complete: false });
		expect(weeks[0].entries!.every((e) => e.game === null)).toBe(true);
		expect(ranked(weeks[0].entries)).toEqual(['BUF', 'KC', 'MIA', 'NYJ']);
		expect(weeks[1].entries).toBeNull();
	});

	it('ranks all 32 teams in the generated data', () => {
		const last = fantasyTeams.weekComplete
			? fantasyTeams.throughWeek
			: fantasyTeams.throughWeek - 1;
		const weeks = weeklyPowerRankings(fantasyTeams.teams, fantasyTeams.draftOrder, last);
		for (const w of weeks.slice(0, last + 1)) expect(w.entries).toHaveLength(32);
	});
});
