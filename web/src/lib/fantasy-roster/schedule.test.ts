import { describe, expect, it } from 'vitest';
import { fantasyTeams, type TeamFantasyStats } from '$lib/data/fantasy';
import { byeWeeks, isBye } from './schedule';
import { gameResults } from './team-matchups';
import { gameBreakdown, rankIndex } from './team-rankings';

const zero = { total: 0, rush: 0, pass: 0 };
const played = (week: number, opponent: string) => ({
	week,
	opponent,
	home: true,
	pointsFor: 20,
	pointsAgainst: 10,
	offense: zero,
	defense: zero
});
const upcoming = (week: number, opponent: string) => ({ week, opponent, home: false });

// Played weeks 1 and 3 (bye in week 2); plays weeks 4 and 6 (bye in week 5).
const team = {
	abbr: 'KC',
	games: 2,
	offense: { ...zero },
	defense: { ...zero },
	gameLog: [played(1, 'BUF'), played(3, 'DAL')],
	nextGame: upcoming(4, 'NYJ'),
	schedule: [upcoming(4, 'NYJ'), upcoming(6, 'MIA')]
} as unknown as TeamFantasyStats;

describe('bye weeks', () => {
	it('finds past byes, and an upcoming bye only for the chosen week', () => {
		expect(byeWeeks(team, null)).toEqual([2]);
		expect(byeWeeks(team, 4)).toEqual([2]);
		expect(byeWeeks(team, 5)).toEqual([2, 5]);
		expect([isBye(team, 5), isBye(team, 4), isBye(team, 2), isBye(team, null)]).toEqual([
			true,
			false,
			false,
			false
		]);
	});

	it("counts this week as a bye for a team whose next game is after it", () => {
		// Last played week 5; next game week 7.
		const resting = {
			...team,
			gameLog: [played(5, 'BUF')],
			nextGame: upcoming(7, 'NYJ'),
			schedule: [upcoming(7, 'NYJ')]
		};
		expect(isBye(resting, 6)).toBe(true);
		expect(byeWeeks(resting, null)).toEqual([1, 2, 3, 4, 6]);
		expect(byeWeeks(resting, 6)).toEqual([1, 2, 3, 4, 6]);
	});

	it('needs the full schedule, and a finished season has no upcoming byes', () => {
		expect(byeWeeks({ ...team, schedule: undefined }, 5)).toEqual([]);
		const done = { ...team, nextGame: null, schedule: [] };
		expect(isBye(done, 5)).toBe(false);
		expect(byeWeeks(done, 5)).toEqual([2]);
	});

	it('adds bye rows, in week order, to the team week-by-week lists', () => {
		const ranks = rankIndex([team]);
		expect(gameBreakdown(team, 'offense', 'total', ranks, 5).map((g) => [g.week, !!g.bye])).toEqual([
			[1, false],
			[2, true],
			[3, false],
			[5, true]
		]);
		expect(gameResults(team, 6).map((g) => [g.week, g.bye ?? false, g.result?.outcome ?? null])).toEqual([
			[1, false, 'W'],
			[2, true, null],
			[3, false, 'W'],
			[6, false, null]
		]);
	});

	it('gives every team one bye at most up to its next game in the generated data', () => {
		for (const t of fantasyTeams.teams) expect(byeWeeks(t, null).length).toBeLessThanOrEqual(1);
	});
});
