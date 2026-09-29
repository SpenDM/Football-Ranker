<script lang="ts">
	import type { TeamFantasyStats } from '$lib/data/fantasy';
	import { teamsByAbbr } from '$lib/data/teams';
	import type { RankedTeam } from '$lib/fantasy-roster/team-rankings';
	import ScoreRow from './ScoreRow.svelte';

	let {
		entry,
		detail,
		expanded,
		onclick
	}: {
		entry: RankedTeam;
		detail: (team: TeamFantasyStats) => string;
		/** Whether this row's breakdown is showing (clickable rows only). */
		expanded?: boolean;
		/** Makes the row a button. */
		onclick?: () => void;
	} = $props();

	const team = $derived(teamsByAbbr.get(entry.abbr));
	const info = $derived(detail(entry.team));
</script>

<ScoreRow
	rank={entry.rank}
	teamAbbr={entry.abbr}
	name={team?.nickname ?? entry.abbr}
	detail={info}
	score={entry.score.toFixed(1)}
	title="#{entry.rank} {team?.name ?? entry.abbr}: {entry.score}{info ? ` (${info} per game)` : ''}"
	{expanded}
	{onclick}
/>
