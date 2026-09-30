import { fantasyTeams, type FantasyTeamData } from '$lib/data/fantasy';
import { describe, expect, it } from 'vitest';
import {
	addPlayer,
	addProblem,
	buildPool,
	buildSchedule,
	createLeague,
	dropPlayer,
	lineupFor,
	LINEUP,
	movePlayer,
	moveProblem,
	nextTeamName,
	owners,
	rankBy,
	ROSTER_SIZE,
	rosterOf,
	sharedConflicts,
	standings,
	type League,
	type LeaguePosition,
	type RosterContext
} from './fantasy';

// Four NFL teams: KC and BUF have played weeks 1-2 and play each other in week 3; DAL played
// week 1, had a week 2 bye and plays NYG (who already played week 3 on Thursday) in week 3...
const teamData = {
	season: 2026,
	throughWeek: 3,
	weekComplete: false,
	teams: [
		team('KC', [1, 2], { week: 3, opponent: 'BUF', home: true }),
		team('BUF', [1, 2], { week: 3, opponent: 'KC', home: false }),
		team('DAL', [1], { week: 4, opponent: 'NYG', home: true }),
		team('NYG', [1, 2, 3], { week: 4, opponent: 'DAL', home: false })
	]
} as unknown as FantasyTeamData;

function team(abbr: string, weeks: number[], nextGame: object) {
	return {
		abbr,
		gameLog: weeks.map((week) => ({ week, opponent: 'OPP', home: true })),
		nextGame
	};
}

let n = 0;
function player(position: LeaguePosition, team: string, points: number[] = []) {
	n++;
	return {
		id: `${position}${n}`,
		name: `${position} ${n}`,
		position,
		team,
		games: points.length,
		total: points.reduce((a, b) => a + b, 0),
		average: 0,
		gameLog: points.map((p, i) => ({ week: i + 1, opponent: 'OPP', home: true, points: p }))
	};
}

const players = [
	player('QB', 'KC', [20, 25]),
	player('RB', 'KC', [10, 12]),
	player('RB', 'BUF', [8, 9]),
	player('RB', 'NYG', [5, 5, 30]),
	player('WR', 'BUF', [15, 3]),
	player('WR', 'DAL', [7]),
	player('TE', 'KC', [6, 6]),
	player('K', 'BUF', [9, 1]),
	player('QB', 'BUF', [30, 10])
];
const [qb, rb1, rb2, rbNyg, wr1, wr2, te, k, qb2] = players;

const pool = buildPool({
	season: 2026,
	throughWeek: 3,
	weekComplete: false,
	players: players as never,
	defenses: [{ team: 'KC', games: 2, total: 12, average: 6, gameLog: [] }]
});
const schedule = buildSchedule(teamData);
const ctx: RosterContext = { pool, schedule, week: 3 };
/** A context for setting up earlier weeks without any player being locked. */
const unlocked = (week: number): RosterContext => ({
	pool,
	schedule: { ...schedule, game: () => null },
	week
});

function league(sharedPlayers = false): League {
	return createLeague(
		{ name: 'Test', type: 'fantasy', teamCount: 2, sharedPlayers },
		{ season: 2026, week: 1, owner: null, now: 1 }
	);
}

describe('buildSchedule', () => {
	it('sets lineups for the earliest upcoming week and knows byes and played games', () => {
		expect(schedule.currentWeek).toBe(3);
		expect(schedule.game('DAL', 2)).toBe('BYE');
		expect(schedule.game('DAL', 3)).toBe('BYE');
		expect(schedule.game('NYG', 3)).toMatchObject({ played: true });
		expect(schedule.game('KC', 3)).toEqual({ opponent: 'BUF', home: true, played: false });
		expect(schedule.game('KC', 5)).toBeNull();
	});

	it('works with the generated data', () => {
		const real = buildSchedule(fantasyTeams);
		expect(real.currentWeek).toBeGreaterThanOrEqual(real.throughWeek);
	});
});

describe('buildPool', () => {
	it('adds D/STs named after the team', () => {
		expect(pool.get('DST-KC')).toMatchObject({ name: 'Chiefs D/ST', position: 'DST' });
		expect([...pool.keys()][0]).toBe(qb.id);
	});
});

describe('adding and dropping', () => {
	it('fills the first open starting slot the player fits, then the bench', () => {
		const lg = league();
		const [t] = lg.teams;
		expect(addPlayer(lg, t, rb1.id, null, ctx)).toBeNull();
		expect(addPlayer(lg, t, rb2.id, null, ctx)).toBeNull();
		expect(addPlayer(lg, t, te.id, null, ctx)).toBeNull();
		const lineup = lineupFor(t, 3);
		expect(lineup.starters[LINEUP.indexOf('RB')]).toBe(rb1.id);
		expect(lineup.starters[LINEUP.indexOf('RB') + 1]).toBe(rb2.id);
		expect(lineup.starters[LINEUP.indexOf('TE')]).toBe(te.id);

		// A locked player (NYG already played) goes to the bench.
		expect(addPlayer(lg, t, rbNyg.id, null, ctx)).toBeNull();
		expect(lineupFor(t, 3).bench).toEqual([rbNyg.id]);
	});

	it("won't add a player another team has unless players are shared", () => {
		const lg = league();
		addPlayer(lg, lg.teams[0], qb.id, null, ctx);
		expect(addProblem(lg, lg.teams[1], qb.id, null, ctx)).toBe(`${qb.name} is on Team 1.`);
		lg.settings.sharedPlayers = true;
		expect(addPlayer(lg, lg.teams[1], qb.id, null, ctx)).toBeNull();
		expect(owners(lg, 3).get(qb.id)).toHaveLength(2);
		expect(sharedConflicts(lg, 3)).toEqual([qb.id]);
	});

	it('enforces the roster size and position limits, allowing a drop to make room', () => {
		const lg = league(true);
		const [t] = lg.teams;
		t.lineups[3] = {
			starters: LINEUP.map(() => null),
			bench: ['QB-a', 'QB-b', 'QB-c', 'QB-d']
		};
		for (const id of ['QB-a', 'QB-b', 'QB-c', 'QB-d']) pool.set(id, { ...pool.get(qb.id)!, id });
		expect(addProblem(lg, t, qb2.id, null, ctx)).toBe('Teams can have at most 4 QB.');
		expect(addPlayer(lg, t, qb2.id, 'QB-a', ctx)).toBeNull();
		expect(rosterOf(lineupFor(t, 3))).toContain(qb2.id);

		t.lineups[3].bench = Array.from({ length: ROSTER_SIZE }, (_, i) => `x${i}`);
		expect(addProblem(lg, t, k.id, null, ctx)).toBe('The roster is full (16 players).');
	});

	it("won't drop a starter whose game is over", () => {
		const lg = league();
		const [t] = lg.teams;
		addPlayer(lg, t, rbNyg.id, null, unlocked(3));
		expect(lineupFor(t, 3).starters).toContain(rbNyg.id);
		expect(dropPlayer(t, rbNyg.id, ctx)).toMatch(/locked/);
		expect(dropPlayer(t, rbNyg.id, { ...ctx, week: 4 })).toBeNull();
	});
});

describe('moving players', () => {
	it('swaps with the occupant, benching them when they cannot take the old spot', () => {
		const lg = league();
		const [t] = lg.teams;
		for (const p of [rb1, rb2, wr1, te]) addPlayer(lg, t, p.id, null, ctx);
		const flex = LINEUP.indexOf('FLEX');
		const rb = LINEUP.indexOf('RB');

		// TE → FLEX; the TE slot empties.
		expect(movePlayer(t, te.id, flex, ctx)).toBeNull();
		expect(lineupFor(t, 3).starters[flex]).toBe(te.id);
		expect(lineupFor(t, 3).starters[LINEUP.indexOf('TE')]).toBeNull();

		// RB → FLEX: the TE can't play RB, so goes to the bench.
		expect(movePlayer(t, rb1.id, flex, ctx)).toBeNull();
		expect(lineupFor(t, 3).starters[rb]).toBeNull();
		expect(lineupFor(t, 3).bench).toEqual([te.id]);

		// Bench → occupied slot: the starter goes to the bench.
		expect(moveProblem(t, te.id, rb, ctx)).toBe(`${te.name} can't play RB.`);
		expect(movePlayer(t, te.id, flex, ctx)).toBeNull();
		expect(lineupFor(t, 3).bench).toEqual([rb1.id]);
	});

	it("won't move locked players or swap them out", () => {
		const lg = league();
		const [t] = lg.teams;
		addPlayer(lg, t, rbNyg.id, null, unlocked(3));
		addPlayer(lg, t, rb1.id, null, ctx);
		expect(moveProblem(t, rbNyg.id, 'bench', ctx)).toMatch(/locked/);
		expect(movePlayer(t, rb1.id, LINEUP.indexOf('RB'), ctx)).toMatch(/locked/);
	});

	it('keeps earlier weeks as they were', () => {
		const lg = league();
		const [t] = lg.teams;
		addPlayer(lg, t, wr1.id, null, unlocked(1));
		movePlayer(t, wr1.id, 'bench', unlocked(2));
		expect(lineupFor(t, 1).starters).toContain(wr1.id);
		expect(lineupFor(t, 2).bench).toEqual([wr1.id]);
		expect(lineupFor(t, 3).bench).toEqual([wr1.id]);
	});
});

describe('standings', () => {
	it('scores starters only, ranks each week and the season', () => {
		const lg = league(true);
		const [a, b] = lg.teams;
		for (const p of [qb, wr1, rb1]) addPlayer(lg, a, p.id, null, unlocked(1));
		movePlayer(a, rb1.id, 'bench', unlocked(1));
		for (const p of [qb2, wr2]) addPlayer(lg, b, p.id, null, unlocked(1));

		const table = standings(lg, pool, 2);
		expect(table.weeks).toEqual([1, 2]);
		// Week 1: A 20 + 15 = 35, B 30 + 7 = 37. Week 2: A 25 + 3 = 28, B 10 + 0 = 10.
		expect(table.byWeek.get(1)!.map((r) => [r.team.name, r.points, r.rank])).toEqual([
			['Team 2', 37, 1],
			['Team 1', 35, 2]
		]);
		expect(table.season.map((r) => [r.team.name, r.total, r.rank])).toEqual([
			['Team 1', 63, 1],
			['Team 2', 47, 2]
		]);
		expect(table.season[0].weekly.get(2)).toEqual({ points: 28, rank: 1 });

		lg.settings.startWeek = 2;
		expect(standings(lg, pool, 2).season.map((r) => r.total)).toEqual([28, 10]);
	});

	it('uses the first lineup for weeks before a team made any change', () => {
		const lg = league();
		addPlayer(lg, lg.teams[0], qb.id, null, unlocked(2));
		expect(standings(lg, pool, 2).season[0].weekly.get(1)?.points).toBe(20);
	});

	it('gives tied teams the same rank', () => {
		expect(rankBy([{ p: 5 }, { p: 9 }, { p: 5 }, { p: 1 }], (r) => r.p).map((r) => r.rank)).toEqual([
			1, 2, 2, 4
		]);
	});
});

describe('createLeague', () => {
	it('names teams and clamps the team count', () => {
		const lg = createLeague(
			{ name: '  ', type: 'fantasy', teamCount: 40, sharedPlayers: false },
			{ season: 2026, week: 4, owner: 'u1' }
		);
		expect(lg.name).toBe('My League');
		expect(lg.teams).toHaveLength(16);
		expect(lg.settings).toEqual({ sharedPlayers: false, startWeek: 4 });
		lg.teams.splice(1, 1);
		expect(nextTeamName(lg)).toBe('Team 2');
	});
});
