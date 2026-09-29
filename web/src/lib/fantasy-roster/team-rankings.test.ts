import { describe, expect, it } from 'vitest';
import { fantasyTeams, type TeamFantasyStats } from '$lib/data/fantasy';
import { teamsByAbbr } from '$lib/data/teams';
import { rankTeams, topAndBottom, UNITS } from './team-rankings';

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
		}
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
