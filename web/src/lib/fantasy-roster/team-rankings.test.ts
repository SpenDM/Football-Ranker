import { describe, expect, it } from 'vitest';
import { fantasyTeams, type TeamFantasyStats } from '$lib/data/fantasy';
import { teamsByAbbr } from '$lib/data/teams';
import { gameBreakdown, rankIndex, rankTeams, topAndBottom, UNITS } from './team-rankings';

function team(abbr: string, offenseTotal: number, defenseRush: number): TeamFantasyStats {
	return {
		abbr,
		games: 1,
		offense: {
			total: offenseTotal,
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
			total: 0,
			rush: defenseRush,
			pass: 0,
			sacksPerGame: 0,
			takeawaysPerGame: 0,
			pointsAllowedPerGame: 0
		},
		gameLog: []
	};
}

const sample = [team('KC', 500, 20), team('BUF', 650, 8), team('DAL', 500, 12), team('NYJ', 300, 30)];

describe('rankTeams', () => {
	it('ranks higher scores first, breaking ties alphabetically', () => {
		const ranked = rankTeams(sample, 'offense', { split: 'total', higherIsBetter: true });
		expect(ranked.map((r) => [r.rank, r.abbr])).toEqual([
			[1, 'BUF'],
			[2, 'DAL'],
			[3, 'KC'],
			[4, 'NYJ']
		]);
	});

	it('ranks fewest points allowed first when lower is better', () => {
		const ranked = rankTeams(sample, 'defense', { split: 'rush', higherIsBetter: false });
		expect(ranked.map((r) => r.abbr)).toEqual(['BUF', 'DAL', 'KC', 'NYJ']);
		expect(ranked[0].score).toBe(8);
	});
});

describe('topAndBottom', () => {
	it('lists the best first and the worst first', () => {
		const ranked = rankTeams(sample, 'offense', { split: 'total', higherIsBetter: true });
		const { top, bottom } = topAndBottom(ranked, 2);
		expect(top.map((r) => r.abbr)).toEqual(['BUF', 'DAL']);
		expect(bottom.map((r) => [r.rank, r.abbr])).toEqual([
			[4, 'NYJ'],
			[3, 'KC']
		]);
	});
});

describe('gameBreakdown', () => {
	it("lists each game's score with the opponent's rank in the complementary category", () => {
		const teams = sample.map((t) => ({ ...t }));
		teams[0].gameLog = [
			{
				week: 1,
				opponent: 'NYJ',
				home: true,
				offense: { total: 450, rush: 0, pass: 0 },
				defense: { total: 0, rush: 25, pass: 0 }
			},
			{
				week: 3,
				opponent: 'BUF',
				home: false,
				offense: { total: 550, rush: 0, pass: 0 },
				defense: { total: 0, rush: 15, pass: 0 }
			}
		];
		const ranks = rankIndex(teams);
		// KC's defense vs the run: BUF's rushing offense and NYJ's are tied at 0, so alphabetical.
		expect(gameBreakdown(teams[0], 'defense', 'rush', ranks)).toEqual([
			{ week: 1, opponent: 'NYJ', home: true, score: 25, opponentRank: 4 },
			{ week: 3, opponent: 'BUF', home: false, score: 15, opponentRank: 1 }
		]);
		// KC's overall offense vs overall defenses (all 0: alphabetical BUF, DAL, KC, NYJ).
		expect(gameBreakdown(teams[0], 'offense', 'total', ranks).map((g) => g.opponentRank)).toEqual([
			4, 1
		]);
	});
});

describe('generated fantasy data', () => {
	it('covers every app team and every unit/split', () => {
		expect(fantasyTeams.teams).toHaveLength(32);
		for (const t of fantasyTeams.teams) expect(teamsByAbbr.has(t.abbr)).toBe(true);
		for (const { unit, categories } of UNITS) {
			for (const category of categories) {
				const { top, bottom } = topAndBottom(rankTeams(fantasyTeams.teams, unit, category));
				expect(top).toHaveLength(10);
				expect(bottom).toHaveLength(10);
				expect(bottom[0].rank).toBe(32);
			}
		}
	});
});
