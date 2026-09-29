import { teams, type Team } from '$lib/data/teams';

/** A team's city (or region), e.g. "New York" for the Jets. */
export function cityOf(team: Team): string {
	return team.name.slice(0, team.name.length - team.nickname.length).trim();
}

/**
 * Teams whose city or nickname matches the query (case-insensitive), e.g. "new york" finds the
 * Giants and Jets. Teams whose city or nickname starts with the query come first.
 */
export function searchTeams(query: string, pool: Team[] = teams): Team[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const starts = (t: Team) =>
		cityOf(t).toLowerCase().startsWith(q) || t.nickname.toLowerCase().startsWith(q);
	return pool
		.filter((t) => t.name.toLowerCase().includes(q) || t.abbr.toLowerCase() === q)
		.sort((a, b) => Number(starts(b)) - Number(starts(a)) || a.name.localeCompare(b.name));
}
