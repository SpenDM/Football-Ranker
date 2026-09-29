import type { DefenseStats, OffenseStats, TeamFantasyStats } from '$lib/data/fantasy';

export type Unit = 'offense' | 'defense';
export type Split = 'total' | 'rush' | 'pass';

export type Category = {
	split: Split;
	title: string;
	/** How the score is calculated, shown under the category title. */
	formula: string;
	higherIsBetter: boolean;
	/** Supporting per-game stats shown next to each team. */
	detail: (team: TeamFantasyStats) => string;
};

export type UnitView = { unit: Unit; title: string; categories: Category[] };

export type RankedTeam = { abbr: string; rank: number; score: number; team: TeamFantasyStats };

/** One decimal place, so per-game stats line up. */
const f = (n: number) => n.toFixed(1);
const offense = (fn: (o: OffenseStats) => string) => (t: TeamFantasyStats) => fn(t.offense);
const defense = (fn: (d: DefenseStats) => string) => (t: TeamFantasyStats) => fn(t.defense);

export const UNITS: UnitView[] = [
	{
		unit: 'offense',
		title: 'Offense',
		categories: [
			{
				split: 'total',
				title: 'Overall',
				formula: '(yards + 10 × points) per game',
				higherIsBetter: true,
				detail: offense((o) => `${f(o.yardsPerGame)} yds · ${f(o.pointsPerGame)} pts`)
			},
			{
				split: 'rush',
				title: 'Rushing',
				formula: '(rush yards + 10 × rush TD points) per game',
				higherIsBetter: true,
				detail: offense((o) => `${f(o.rushYardsPerGame)} yds · ${f(o.rushTdsPerGame)} TD`)
			},
			{
				split: 'pass',
				title: 'Passing',
				formula: '(pass yards + 10 × pass TD points) per game',
				higherIsBetter: true,
				detail: offense((o) => `${f(o.passYardsPerGame)} yds · ${f(o.passTdsPerGame)} TD`)
			}
		]
	},
	{
		unit: 'defense',
		title: 'Defense',
		categories: [
			{
				split: 'total',
				title: 'Overall',
				formula: 'DST fantasy points per game',
				higherIsBetter: true,
				detail: defense(
					(d) => `${f(d.sacksPerGame)} sk · ${f(d.takeawaysPerGame)} TO · ${f(d.pointsAllowedPerGame)} PA`
				)
			},
			{
				split: 'rush',
				title: 'Rushing',
				formula: 'PPR points allowed to rushers per game (fewer is better)',
				higherIsBetter: false,
				detail: () => ''
			},
			{
				split: 'pass',
				title: 'Passing',
				formula: 'PPR points allowed to passers and receivers per game (fewer is better)',
				higherIsBetter: false,
				detail: () => ''
			}
		]
	}
];

/** Teams ordered best to worst for one unit and split; ties are broken alphabetically. */
export function rankTeams(
	teams: TeamFantasyStats[],
	unit: Unit,
	category: Pick<Category, 'split' | 'higherIsBetter'>
): RankedTeam[] {
	const direction = category.higherIsBetter ? -1 : 1;
	return teams
		.map((team) => ({ abbr: team.abbr, score: team[unit][category.split], team }))
		.sort((a, b) => direction * (a.score - b.score) || a.abbr.localeCompare(b.abbr))
		.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/** Rank of every team (by abbreviation) in each unit and split. */
export type RankIndex = Record<Unit, Record<Split, Map<string, number>>>;

export function rankIndex(teams: TeamFantasyStats[]): RankIndex {
	const index = {} as RankIndex;
	for (const { unit, categories } of UNITS) {
		index[unit] = {} as Record<Split, Map<string, number>>;
		for (const category of categories) {
			index[unit][category.split] = new Map(
				rankTeams(teams, unit, category).map((r) => [r.abbr, r.rank])
			);
		}
	}
	return index;
}

export const otherUnit = (unit: Unit): Unit => (unit === 'offense' ? 'defense' : 'offense');

export type GameBreakdown = {
	week: number;
	opponent: string;
	home: boolean;
	/** Null for the team's upcoming game. */
	score: number | null;
	/** The opponent's rank in the complementary category (e.g. rushing defense for rushing offense). */
	opponentRank: number | undefined;
};

/** A team's game-by-game scores in one category, with each opponent's complementary rank,
 *  followed by its upcoming game (without a score). */
export function gameBreakdown(
	team: TeamFantasyStats,
	unit: Unit,
	split: Split,
	ranks: RankIndex
): GameBreakdown[] {
	const opposing = ranks[otherUnit(unit)][split];
	const played = team.gameLog.map((g) => ({
		week: g.week,
		opponent: g.opponent,
		home: g.home,
		score: g[unit][split],
		opponentRank: opposing.get(g.opponent)
	}));
	const next = team.nextGame;
	return next
		? [...played, { ...next, score: null, opponentRank: opposing.get(next.opponent) }]
		: played;
}

/** The best `count` teams (best first) and the worst `count` teams (worst first). */
export function topAndBottom(ranked: RankedTeam[], count = 10) {
	return {
		top: ranked.slice(0, count),
		bottom: ranked.slice(-count).reverse()
	};
}
