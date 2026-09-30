import type { FantasyPlayerData, FantasyTeamData } from '$lib/data/fantasy';
import { teamsByAbbr } from '$lib/data/teams';

/** Most leagues a user can have, and most teams in a league. */
export const MAX_LEAGUES = 10;
export const MAX_TEAMS = 16;
export const MAX_NAME_LENGTH = 40;

export type LeagueType = 'fantasy';

export const LEAGUE_TYPES: { id: LeagueType; label: string }[] = [
	{ id: 'fantasy', label: 'Fantasy football' }
];

export type LeaguePosition = 'QB' | 'RB' | 'WR' | 'TE' | 'DST' | 'K';
export type SlotKind = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DST' | 'K';

/** ESPN's default starting lineup. */
export const LINEUP: SlotKind[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'];
export const BENCH_SIZE = 7;
export const ROSTER_SIZE = LINEUP.length + BENCH_SIZE;

export const SLOT_POSITIONS: Record<SlotKind, LeaguePosition[]> = {
	QB: ['QB'],
	RB: ['RB'],
	WR: ['WR'],
	TE: ['TE'],
	FLEX: ['RB', 'WR', 'TE'],
	DST: ['DST'],
	K: ['K']
};

export const POSITION_LABELS: Record<SlotKind, string> = {
	QB: 'QB',
	RB: 'RB',
	WR: 'WR',
	TE: 'TE',
	FLEX: 'RB/WR/TE',
	DST: 'D/ST',
	K: 'K'
};

/** ESPN's default limit on players of each position per roster. */
export const POSITION_MAX: Record<LeaguePosition, number> = {
	QB: 4,
	RB: 8,
	WR: 8,
	TE: 3,
	DST: 3,
	K: 3
};

/** Who's starting in each LINEUP slot (null = empty) and who's on the bench, for one week. */
export type Lineup = { starters: (string | null)[]; bench: string[] };

export type LeagueTeam = {
	id: string;
	name: string;
	/**
	 * Lineups keyed by week number. A week without one uses the latest earlier lineup (nothing
	 * changed that week), or the earliest lineup for weeks before the team's first change.
	 */
	lineups: Record<string, Lineup>;
};

export type LeagueSettings = {
	/** Whether more than one team can roster the same player. */
	sharedPlayers: boolean;
	/** The first week that counts in the standings. */
	startWeek: number;
};

export type League = {
	id: string;
	name: string;
	type: LeagueType;
	season: number;
	/** The signed-in account that owns the league, or null for a league kept only in this browser. */
	owner: string | null;
	createdAt: number;
	updatedAt: number;
	settings: LeagueSettings;
	teams: LeagueTeam[];
};

/** A player (or a D/ST, with id "DST-<team>") that can be rostered, with points by week. */
export type PoolPlayer = {
	id: string;
	name: string;
	position: LeaguePosition;
	/** NFL team abbreviation. */
	team: string;
	games: number;
	total: number;
	average: number;
	points: Map<number, number>;
};

export type Pool = Map<string, PoolPlayer>;

export function newId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Every rosterable player and D/ST, highest season total first. */
export function buildPool(data: FantasyPlayerData): Pool {
	const players: PoolPlayer[] = [
		...data.players.map((p) => ({
			id: p.id,
			name: p.name,
			position: p.position as LeaguePosition,
			team: p.team,
			games: p.games,
			total: p.total,
			average: p.average,
			points: new Map(p.gameLog.map((g) => [g.week, g.points]))
		})),
		...(data.defenses ?? []).map((d) => ({
			id: `DST-${d.team}`,
			name: `${teamsByAbbr.get(d.team)?.nickname ?? d.team} D/ST`,
			position: 'DST' as const,
			team: d.team,
			games: d.games,
			total: d.total,
			average: d.average,
			points: new Map(d.gameLog.map((g) => [g.week, g.points]))
		}))
	];
	players.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
	return new Map(players.map((p) => [p.id, p]));
}

/** An NFL team's game in a week: an opponent, "BYE", or null when it isn't known yet. */
export type WeekGame = { opponent: string; home: boolean; played: boolean } | 'BYE' | null;

/** The season's calendar as far as the data knows it. */
export type Schedule = {
	season: number;
	/** The latest week with games counted (0 before the season). */
	throughWeek: number;
	/** The week lineups are being set for, or null once the season is over. */
	currentWeek: number | null;
	game(team: string, week: number): WeekGame;
};

export function buildSchedule(data: FantasyTeamData): Schedule {
	const teams = new Map(data.teams.map((t) => [t.abbr, t]));
	const upcoming = data.teams.flatMap((t) => (t.nextGame ? [t.nextGame.week] : []));
	return {
		season: data.season,
		throughWeek: data.throughWeek,
		currentWeek: upcoming.length ? Math.min(...upcoming) : null,
		game(abbr, week) {
			const team = teams.get(abbr);
			if (!team) return null;
			const played = team.gameLog.find((g) => g.week === week);
			if (played) return { opponent: played.opponent, home: played.home, played: true };
			const next = team.nextGame;
			if (next?.week === week) return { opponent: next.opponent, home: next.home, played: false };
			// No game before the next one (or at all, once the season is over) means a bye.
			return !next || week < next.week ? 'BYE' : null;
		}
	};
}

/** A team's game in a week for display: "vs BUF", "@ KC", "BYE" or "—". */
export function gameLabel(schedule: Schedule, team: string, week: number): string {
	const game = schedule.game(team, week);
	if (game === null) return '—';
	if (game === 'BYE') return 'BYE';
	return `${game.home ? 'vs' : '@'} ${game.opponent}`;
}

/** Whether a player's game this week is over, so they can't be moved in or out of the lineup. */
export function isLocked(player: PoolPlayer | undefined, week: number, schedule: Schedule): boolean {
	if (!player) return false;
	const game = schedule.game(player.team, week);
	return game !== null && game !== 'BYE' && game.played;
}

export function emptyLineup(): Lineup {
	return { starters: LINEUP.map(() => null), bench: [] };
}

function cloneLineup(lineup: Lineup): Lineup {
	return { starters: [...lineup.starters], bench: [...lineup.bench] };
}

/** The lineup a team used (or is using) in a week. */
export function lineupFor(team: LeagueTeam, week: number): Lineup {
	const weeks = Object.keys(team.lineups)
		.map(Number)
		.sort((a, b) => a - b);
	const at = weeks.filter((w) => w <= week).at(-1) ?? weeks[0];
	return at === undefined ? emptyLineup() : team.lineups[at];
}

/** Everyone on a lineup: starters in slot order, then the bench. */
export function rosterOf(lineup: Lineup): string[] {
	return [...lineup.starters.filter((id): id is string => id !== null), ...lineup.bench];
}

/** The team's own lineup for a week, created from the lineup it carries over if needed. */
function editableLineup(team: LeagueTeam, week: number): Lineup {
	team.lineups[week] ??= cloneLineup(lineupFor(team, week));
	return team.lineups[week];
}

export function eligible(player: PoolPlayer | undefined, slot: SlotKind): boolean {
	return Boolean(player && SLOT_POSITIONS[slot].includes(player.position));
}

/** The teams rostering each player in a week. */
export function owners(league: League, week: number): Map<string, LeagueTeam[]> {
	const byPlayer = new Map<string, LeagueTeam[]>();
	for (const team of league.teams) {
		for (const id of rosterOf(lineupFor(team, week))) {
			byPlayer.set(id, [...(byPlayer.get(id) ?? []), team]);
		}
	}
	return byPlayer;
}

/** Players on more than one team in a week (they block turning off shared players). */
export function sharedConflicts(league: League, week: number): string[] {
	return [...owners(league, week)].filter(([, teams]) => teams.length > 1).map(([id]) => id);
}

export type RosterContext = { pool: Pool; schedule: Schedule; week: number };

/** Why a player can't be added (optionally dropping someone), or null if they can. */
export function addProblem(
	league: League,
	team: LeagueTeam,
	playerId: string,
	dropId: string | null,
	{ pool, schedule, week }: RosterContext
): string | null {
	const player = pool.get(playerId);
	if (!player) return 'Unknown player.';
	const lineup = lineupFor(team, week);
	const roster = rosterOf(lineup);
	if (roster.includes(playerId)) return `${player.name} is already on this team.`;
	if (!league.settings.sharedPlayers) {
		const owner = league.teams.find(
			(t) => t.id !== team.id && rosterOf(lineupFor(t, week)).includes(playerId)
		);
		if (owner) return `${player.name} is on ${owner.name}.`;
	}
	if (dropId !== null) {
		if (!roster.includes(dropId)) return 'That player is not on this team.';
		if (lineup.starters.includes(dropId) && isLocked(pool.get(dropId), week, schedule)) {
			return `${pool.get(dropId)?.name ?? 'That player'} is locked in the lineup this week.`;
		}
	}
	const after = roster.filter((id) => id !== dropId);
	if (after.length >= ROSTER_SIZE) return `The roster is full (${ROSTER_SIZE} players).`;
	const samePosition = after.filter((id) => pool.get(id)?.position === player.position).length;
	if (samePosition >= POSITION_MAX[player.position]) {
		return `Teams can have at most ${POSITION_MAX[player.position]} ${POSITION_LABELS[player.position]}.`;
	}
	return null;
}

/**
 * Add a player (to the first open starting slot they fit, or the bench), optionally dropping
 * someone. Returns why it couldn't be done, or null on success.
 */
export function addPlayer(
	league: League,
	team: LeagueTeam,
	playerId: string,
	dropId: string | null,
	ctx: RosterContext
): string | null {
	const problem = addProblem(league, team, playerId, dropId, ctx);
	if (problem) return problem;
	if (dropId !== null) removeFrom(editableLineup(team, ctx.week), dropId);
	const lineup = editableLineup(team, ctx.week);
	const player = ctx.pool.get(playerId);
	const open = isLocked(player, ctx.week, ctx.schedule)
		? -1
		: LINEUP.findIndex((slot, i) => lineup.starters[i] === null && eligible(player, slot));
	if (open >= 0) lineup.starters[open] = playerId;
	else lineup.bench.push(playerId);
	return null;
}

function removeFrom(lineup: Lineup, playerId: string): void {
	lineup.starters = lineup.starters.map((id) => (id === playerId ? null : id));
	lineup.bench = lineup.bench.filter((id) => id !== playerId);
}

export function dropProblem(team: LeagueTeam, playerId: string, ctx: RosterContext): string | null {
	const lineup = lineupFor(team, ctx.week);
	if (!rosterOf(lineup).includes(playerId)) return 'That player is not on this team.';
	if (lineup.starters.includes(playerId) && isLocked(ctx.pool.get(playerId), ctx.week, ctx.schedule)) {
		return `${ctx.pool.get(playerId)?.name ?? 'That player'} is locked in the lineup this week.`;
	}
	return null;
}

export function dropPlayer(team: LeagueTeam, playerId: string, ctx: RosterContext): string | null {
	const problem = dropProblem(team, playerId, ctx);
	if (problem) return problem;
	removeFrom(editableLineup(team, ctx.week), playerId);
	return null;
}

/** A place in the lineup: a LINEUP index, or the bench. */
export type Spot = number | 'bench';

function spotOf(lineup: Lineup, playerId: string): Spot | null {
	const index = lineup.starters.indexOf(playerId);
	if (index >= 0) return index;
	return lineup.bench.includes(playerId) ? 'bench' : null;
}

/** Why a player can't move to a spot, or null if they can (whoever's there is swapped out). */
export function moveProblem(
	team: LeagueTeam,
	playerId: string,
	to: Spot,
	{ pool, schedule, week }: RosterContext
): string | null {
	const lineup = lineupFor(team, week);
	const from = spotOf(lineup, playerId);
	const player = pool.get(playerId);
	if (from === null) return 'That player is not on this team.';
	if (from === to) return 'The player is already there.';
	if (isLocked(player, week, schedule)) return `${player?.name} is locked this week.`;
	if (to === 'bench') return null;
	if (!eligible(player, LINEUP[to])) return `${player?.name} can't play ${POSITION_LABELS[LINEUP[to]]}.`;
	const occupant = lineup.starters[to];
	if (occupant && isLocked(pool.get(occupant), week, schedule)) {
		return `${pool.get(occupant)?.name} is locked this week.`;
	}
	return null;
}

/**
 * Move a player to a spot. Whoever was there takes the player's old spot if they can play it,
 * and otherwise goes to the bench. Returns why it couldn't be done, or null on success.
 */
export function movePlayer(
	team: LeagueTeam,
	playerId: string,
	to: Spot,
	ctx: RosterContext
): string | null {
	const problem = moveProblem(team, playerId, to, ctx);
	if (problem) return problem;
	const lineup = editableLineup(team, ctx.week);
	const from = spotOf(lineup, playerId)!;
	const occupant = to === 'bench' ? null : lineup.starters[to];

	removeFrom(lineup, playerId);
	if (to === 'bench') {
		lineup.bench.push(playerId);
		return null;
	}
	if (occupant) {
		removeFrom(lineup, occupant);
		if (from !== 'bench' && eligible(ctx.pool.get(occupant), LINEUP[from])) {
			lineup.starters[from] = occupant;
		} else {
			lineup.bench.push(occupant);
		}
	}
	lineup.starters[to] = playerId;
	return null;
}

/** A player's points in a week (0 if they didn't play). */
export function pointsIn(player: PoolPlayer | undefined, week: number): number {
	return player?.points.get(week) ?? 0;
}

/** A team's points in a week: the sum of its starters' points. */
export function teamPoints(team: LeagueTeam, week: number, pool: Pool): number {
	const total = lineupFor(team, week).starters.reduce(
		(sum, id) => sum + (id ? pointsIn(pool.get(id), week) : 0),
		0
	);
	return round2(total);
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

export type Ranked<T> = T & { rank: number };

/** Sort by points (highest first) with ties sharing a rank (1, 2, 2, 4). */
export function rankBy<T>(items: T[], points: (item: T) => number): Ranked<T>[] {
	const sorted = [...items].sort((a, b) => points(b) - points(a));
	let rank = 0;
	return sorted.map((item, i) => {
		if (i === 0 || points(item) !== points(sorted[i - 1])) rank = i + 1;
		return { ...item, rank };
	});
}

export type StandingsRow = {
	team: LeagueTeam;
	total: number;
	/** Points and rank in each counted week. */
	weekly: Map<number, { points: number; rank: number }>;
};

export type Standings = {
	/** The weeks that count, from the league's start week through the latest week with games. */
	weeks: number[];
	/** Season standings: every team ranked by total points. */
	season: Ranked<StandingsRow>[];
	/** Each week's teams ranked by that week's points. */
	byWeek: Map<number, Ranked<{ team: LeagueTeam; points: number }>[]>;
};

export function standings(league: League, pool: Pool, throughWeek: number): Standings {
	const weeks: number[] = [];
	for (let w = league.settings.startWeek; w <= throughWeek; w++) weeks.push(w);

	const byWeek = new Map(
		weeks.map((week) => [
			week,
			rankBy(
				league.teams.map((team) => ({ team, points: teamPoints(team, week, pool) })),
				(r) => r.points
			)
		])
	);
	const rows: StandingsRow[] = league.teams.map((team) => {
		const weekly = new Map<number, { points: number; rank: number }>();
		for (const [week, ranked] of byWeek) {
			const row = ranked.find((r) => r.team.id === team.id)!;
			weekly.set(week, { points: row.points, rank: row.rank });
		}
		const total = round2([...weekly.values()].reduce((sum, w) => sum + w.points, 0));
		return { team, total, weekly };
	});
	return { weeks, season: rankBy(rows, (r) => r.total), byWeek };
}

export type NewLeague = {
	name: string;
	type: LeagueType;
	teamCount: number;
	sharedPlayers: boolean;
};

export function createLeague(
	input: NewLeague,
	{ season, week, owner, now = Date.now() }: {
		season: number;
		week: number;
		owner: string | null;
		now?: number;
	}
): League {
	const count = Math.min(MAX_TEAMS, Math.max(1, Math.round(input.teamCount)));
	return {
		id: newId('league'),
		name: input.name.trim().slice(0, MAX_NAME_LENGTH) || 'My League',
		type: input.type,
		season,
		owner,
		createdAt: now,
		updatedAt: now,
		settings: { sharedPlayers: input.sharedPlayers, startWeek: Math.max(1, week) },
		teams: Array.from({ length: count }, (_, i) => newTeam(`Team ${i + 1}`))
	};
}

export function newTeam(name: string): LeagueTeam {
	return { id: newId('team'), name, lineups: {} };
}

/** The lowest unused "Team N" name. */
export function nextTeamName(league: League): string {
	const names = new Set(league.teams.map((t) => t.name));
	let n = 1;
	while (names.has(`Team ${n}`)) n++;
	return `Team ${n}`;
}
