import type { TeamFantasyStats, UpcomingGame } from '$lib/data/fantasy';

/** A team's games still to play, in week order (just the next one in older data). */
export function remainingGames(team: TeamFantasyStats): UpcomingGame[] {
	return team.schedule ?? (team.nextGame ? [team.nextGame] : []);
}

/** A team's game in a week, or null for a bye (or a week already played). With no week, its
 *  next game. */
export function gameInWeek(team: TeamFantasyStats, week: number | null): UpcomingGame | null {
	if (week === null) return team.nextGame;
	return remainingGames(team).find((g) => g.week === week) ?? null;
}

/** Weeks with a game still to play, earliest (the current week) first. */
export function upcomingWeeks(teams: TeamFantasyStats[]): number[] {
	const weeks = new Set(teams.flatMap((t) => remainingGames(t).map((g) => g.week)));
	return [...weeks].sort((a, b) => a - b);
}

/** The week to show: the chosen one if it still has games, otherwise the current week. */
export function resolveWeek(teams: TeamFantasyStats[], chosen: number | null): number | null {
	const weeks = upcomingWeeks(teams);
	return chosen !== null && weeks.includes(chosen) ? chosen : (weeks[0] ?? null);
}

/** The week after the team's last game played (1 before its first). */
function weekAfterLastGame(team: TeamFantasyStats): number {
	return Math.max(0, ...team.gameLog.map((g) => g.week)) + 1;
}

/**
 * Whether `week` is one of the team's upcoming bye weeks: a week after its last game played with
 * no game, while it still has games left. Needs the full schedule (older data only has the next
 * game), so it's false without one.
 */
export function isBye(team: TeamFantasyStats, week: number | null): boolean {
	// No games left means the team's season is over, not a bye.
	if (week === null || !team.schedule?.length) return false;
	return week >= weekAfterLastGame(team) && !team.schedule.some((g) => g.week === week);
}

/**
 * The bye weeks to show in a team's week-by-week list: its byes so far, any bye before its next
 * game, and `week` if that's an upcoming bye. Needs the full schedule, so it's empty without one.
 */
export function byeWeeks(team: TeamFantasyStats, week: number | null): number[] {
	if (!team.schedule) return [];
	const played = new Set(team.gameLog.map((g) => g.week));
	const remaining = new Set(team.schedule.map((g) => g.week));
	const until = team.nextGame?.week ?? weekAfterLastGame(team);
	const byes: number[] = [];
	for (let w = 1; w < until; w++) if (!played.has(w) && !remaining.has(w)) byes.push(w);
	if (isBye(team, week) && !byes.includes(week!)) byes.push(week!);
	return byes;
}
