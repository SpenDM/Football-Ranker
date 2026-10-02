import { describe, expect, it } from 'vitest';
import { fantasyTeams, type GameLogEntry, type TeamFantasyStats } from '$lib/data/fantasy';
import { opponentModifier, REGULAR_SEASON_WEEKS, weeklyPowerRankings } from './team-power';

describe('opponentModifier', () => {
	it('scales a win from 1.5× against #1 to 0.5× against #32, and a loss the reverse', () => {
		expect(opponentModifier(1, 7)).toBe(1.5);
		expect(opponentModifier(32, 7)).toBe(0.5);
		expect(opponentModifier(1, -7)).toBe(0.5);
		expect(opponentModifier(32, -7)).toBe(1.5);
		expect(opponentModifier(16, 3)).toBeCloseTo(1.0161, 4);
	});
});

const zero = { total: 0, rush: 0, pass: 0 };

function team(abbr: string, games: [week: number, opponent: string, pf: number, pa: number][]) {
	const gameLog: GameLogEntry[] = games.map(([week, opponent, pointsFor, pointsAgainst]) => ({
		week,
		opponent,
		home: true,
		pointsFor,
		pointsAgainst,
		offense: zero,
		defense: zero
	}));
	return { abbr, gameLog } as TeamFantasyStats;
}

describe('weeklyPowerRankings', () => {
	// Week 1: NYJ beat #1 BUF by 10; KC and MIA tied. Week 2: KC beat BUF by 10; NYJ and MIA had byes.
	const teams = [
		team('BUF', [
			[1, 'NYJ', 10, 20],
			[2, 'KC', 20, 30]
		]),
		team('KC', [
			[1, 'MIA', 17, 17],
			[2, 'BUF', 30, 20]
		]),
		team('MIA', [[1, 'KC', 17, 17]]),
		team('NYJ', [[1, 'BUF', 20, 10]])
	];
	const draftOrder = ['NYJ', 'MIA', 'KC', 'BUF'];
	const ranked = (entries: { abbr: string }[] | null) => entries?.map((e) => e.abbr);

	it('starts in reverse draft order and re-ranks by ranking points after each complete week', () => {
		const weeks = weeklyPowerRankings(teams, draftOrder, 2);
		expect(weeks).toHaveLength(REGULAR_SEASON_WEEKS);
		// Starting ranking points are the reversed rank: 4 for #1 down to 1 for #4.
		expect(weeks[0].entries!.map((e) => [e.abbr, e.rank, e.points])).toEqual([
			['BUF', 1, 4],
			['KC', 2, 3],
			['MIA', 3, 2],
			['NYJ', 4, 1]
		]);

		const [buf, kc, , nyj] = weeks[0].entries!;
		// A 10-point win over #1 counts 1.5×; a 10-point loss to #4 (last) counts 1.5×.
		expect(nyj.game).toMatchObject({ opponent: 'BUF', outcome: 'W', opponentRank: 1, change: 15 });
		expect(buf.game).toMatchObject({ outcome: 'L', opponentRank: 4, change: -15 });
		expect(kc.game).toMatchObject({ outcome: 'T', change: 0 });

		expect(weeks[1].entries!.map((e) => [e.abbr, e.rank, e.points])).toEqual([
			['NYJ', 1, 16],
			['KC', 2, 3],
			['MIA', 3, 2],
			['BUF', 4, -11]
		]);
		const week2 = new Map(weeks[1].entries!.map((e) => [e.abbr, e]));
		// A 10-point win over #4 counts 0.5×; a 10-point loss to #2 counts 1.5 - 2/3.
		expect(week2.get('KC')!.game!.change).toBe(5);
		expect(week2.get('BUF')!.game!.change).toBeCloseTo(-8.333, 3);
		expect(week2.get('NYJ')!.game).toBeNull();

		expect(weeks[2].complete).toBe(false);
		expect(weeks[2].entries!.map((e) => [e.abbr, e.game])).toEqual([
			['NYJ', null],
			['KC', null],
			['MIA', null],
			['BUF', null]
		]);
		expect(weeks[2].entries![1].points).toBe(8);
		expect(weeks.slice(3).every((w) => w.entries === null)).toBe(true);
	});

	it('keeps the previous order for teams tied on ranking points', () => {
		// 5 teams start on 5..1. #5 E beats #3 C by 1 (1× either way against the middle team):
		// E reaches 2, level with D (bye), and D stays ahead; C drops to 1.5.
		const five = [team('C', [[1, 'E', 10, 11]]), team('E', [[1, 'C', 11, 10]])];
		const weeks = weeklyPowerRankings(five, ['E', 'D', 'C', 'B', 'A'], 1);
		expect(weeks[1].entries!.map((e) => [e.abbr, e.points])).toEqual([
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
		const last = fantasyTeams.weekComplete ? fantasyTeams.throughWeek : fantasyTeams.throughWeek - 1;
		const weeks = weeklyPowerRankings(fantasyTeams.teams, fantasyTeams.draftOrder, last);
		for (const w of weeks.slice(0, last + 1)) expect(w.entries).toHaveLength(32);
	});
});
