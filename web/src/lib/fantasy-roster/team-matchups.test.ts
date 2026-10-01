import { describe, expect, it } from 'vitest';
import { fantasyTeams, type TeamFantasyStats, type UpcomingGame } from '$lib/data/fantasy';
import { upcomingMatchups } from './team-matchups';
import { rankIndex } from './team-rankings';

function team(abbr: string, offense: number, defense: number, nextGame: UpcomingGame | null): TeamFantasyStats {
	return {
		abbr,
		games: 1,
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
			total: defense,
			rush: 0,
			pass: 0,
			sacksPerGame: 0,
			takeawaysPerGame: 0,
			pointsAllowedPerGame: 0
		},
		gameLog: [],
		nextGame
	};
}

describe('upcomingMatchups', () => {
	// Offense ranks: BUF 1, KC 2, DAL 3, NYJ 4, MIA 5, NE 6. Defense ranks: NYJ 1, BUF 2, KC 3,
	// DAL 4, NE 5, MIA 6.
	const teams = [
		team('BUF', 600, 9, { week: 5, opponent: 'NYJ', home: false }),
		team('NYJ', 300, 12, { week: 5, opponent: 'BUF', home: true }),
		team('KC', 500, 8, { week: 5, opponent: 'DAL', home: true }),
		team('DAL', 400, 6, { week: 5, opponent: 'KC', home: false }),
		team('MIA', 200, 1, { week: 6, opponent: 'NE', home: true }),
		team('NE', 100, 2, { week: 6, opponent: 'MIA', home: false })
	];

	it("lists each of the earliest week's games once, better team first, most lopsided first (ties alphabetically)", () => {
		const { week, games } = upcomingMatchups(teams, rankIndex(teams));
		expect(week).toBe(5);
		expect(games).toEqual([
			{
				// BUF 1 + 2 = 3 vs NYJ 4 + 1 = 5: the better team is the away team.
				better: { abbr: 'BUF', home: false, offenseRank: 1, defenseRank: 2 },
				worse: { abbr: 'NYJ', home: true, offenseRank: 4, defenseRank: 1 },
				score: 2
			},
			{
				// KC 2 + 3 = 5 vs DAL 3 + 4 = 7.
				better: { abbr: 'KC', home: true, offenseRank: 2, defenseRank: 3 },
				worse: { abbr: 'DAL', home: false, offenseRank: 3, defenseRank: 4 },
				score: 2
			}
		]);
	});

	it('lists the home team first when the rank totals tie', () => {
		const tied = [
			team('BUF', 600, 1, { week: 1, opponent: 'NYJ', home: false }),
			team('NYJ', 500, 2, { week: 1, opponent: 'BUF', home: true })
		];
		const [game] = upcomingMatchups(tied, rankIndex(tied)).games;
		expect([game.better.abbr, game.worse.abbr, game.score]).toEqual(['NYJ', 'BUF', 0]);
	});

	it('has no week once the season is over', () => {
		const done = teams.map((t) => ({ ...t, nextGame: null }));
		expect(upcomingMatchups(done, rankIndex(done))).toEqual({ week: null, games: [] });
	});

	it('covers every team playing in the generated data', () => {
		const { week, games } = upcomingMatchups(fantasyTeams.teams, rankIndex(fantasyTeams.teams));
		const playing = fantasyTeams.teams.filter((t) => t.nextGame?.week === week);
		expect(games).toHaveLength(playing.length / 2);
		for (const g of games) expect(g.score).toBeGreaterThanOrEqual(0);
	});
});
