<script lang="ts">
	import { asset } from '$app/paths';
	import { fantasyTeams, loadPlayers, PLAYERS_PATH } from '$lib/data/fantasy';
	import { buildPool, buildSchedule, type League, type Pool } from '$lib/leagues/fantasy';
	import { leagues } from '$lib/stores/leagues.svelte';
	import LeaguePlayers from './LeaguePlayers.svelte';
	import LeagueRoster from './LeagueRoster.svelte';
	import LeagueSettings from './LeagueSettings.svelte';
	import LeagueSidebar from './LeagueSidebar.svelte';
	import LeagueStandings from './LeagueStandings.svelte';

	let { league }: { league: League } = $props();

	const schedule = buildSchedule(fantasyTeams);

	let pool = $state<Pool | null>(null);
	let failed = $state(false);
	loadPlayers(asset(PLAYERS_PATH)).then(
		(data) => (pool = buildPool(data)),
		() => (failed = true)
	);

	const team = $derived(
		league.teams.find((t) => t.id === leagues.myTeam.current[league.id]) ?? league.teams[0]
	);
	/** Rosters can change only during the season the league was made for. */
	const readOnlyReason = $derived(
		league.season !== schedule.season
			? `This league is from the ${league.season} season, so its rosters can't change.`
			: schedule.currentWeek === null
				? `The ${league.season} regular season is over, so rosters can't change.`
				: null
	);
</script>

<div class="layout">
	<div class="sidebar-slot"><LeagueSidebar {league} {team} {schedule} /></div>

	<div class="canvas">
		{#if readOnlyReason && leagues.view.current !== 'settings'}
			<p class="notice" role="status">{readOnlyReason}</p>
		{/if}
		{#if leagues.view.current === 'settings'}
			<LeagueSettings {league} {schedule} />
		{:else if pool}
			<!-- Switching teams starts each view afresh (no half-finished move or add). -->
			{#key team.id}
				{#if leagues.view.current === 'roster'}
					<LeagueRoster {league} {team} {pool} {schedule} readOnly={Boolean(readOnlyReason)} />
				{:else if leagues.view.current === 'players'}
					<LeaguePlayers {league} {team} {pool} {schedule} readOnly={Boolean(readOnlyReason)} />
				{:else}
					<LeagueStandings {league} {team} {pool} {schedule} />
				{/if}
			{/key}
		{:else if failed}
			<p class="status">Couldn't load player data. Try reloading the page.</p>
		{:else}
			<p class="status">Loading players…</p>
		{/if}
	</div>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 216px minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}

	.sidebar-slot {
		position: sticky;
		top: 16px;
	}

	.canvas {
		container-type: inline-size;
		display: grid;
		gap: 16px;
		min-width: 0;
	}

	.notice {
		margin: 0;
		padding: 10px 14px;
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: 0.9rem;
	}

	.status {
		margin: 0;
		color: var(--muted);
	}

	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.sidebar-slot {
			position: static;
		}
	}
</style>
