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
