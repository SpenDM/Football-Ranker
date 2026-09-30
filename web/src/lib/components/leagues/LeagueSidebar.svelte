<script lang="ts">
	import type { League, LeagueTeam, Schedule } from '$lib/leagues/fantasy';
	import { leagues, type LeagueView } from '$lib/stores/leagues.svelte';

	let { league, team, schedule }: { league: League; team: LeagueTeam; schedule: Schedule } =
		$props();

	const views: { id: LeagueView; label: string }[] = [
		{ id: 'roster', label: 'Roster' },
		{ id: 'players', label: 'Players' },
		{ id: 'standings', label: 'Standings' },
		{ id: 'settings', label: 'Settings' }
	];
</script>

<aside class="sidebar" aria-label="League">
	<div class="head">
		<a class="back" href="/leagues">← All leagues</a>
		<h2>{league.name}</h2>
	</div>

	<label class="field">
		<span class="label">Your team</span>
		<select
			aria-label="Your team"
			value={team.id}
			onchange={(e) => (leagues.myTeam.current[league.id] = e.currentTarget.value)}
		>
			{#each league.teams as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
		</select>
	</label>

	<nav class="views" aria-label="League views">
		{#each views as view (view.id)}
			<button
				class="btn ghost"
				aria-pressed={leagues.view.current === view.id}
				onclick={() => (leagues.view.current = view.id)}>{view.label}</button
			>
		{/each}
	</nav>

	<div class="data">
		<span class="label">Data</span>
		<p>
			{schedule.season} season{schedule.throughWeek
				? `, through Week ${schedule.throughWeek}`
				: ': no games yet'}.
			{#if schedule.currentWeek}Lineups are for Week {schedule.currentWeek}.{/if}
		</p>
		<p class="hint">
			ESPN default scoring (PPR). Updated every Tuesday from
			<a href="https://github.com/nflverse" target="_blank" rel="noopener">nflverse</a>.
		</p>
	</div>
</aside>

<style>
	.sidebar {
		zoom: 0.9;
		display: grid;
		gap: 14px;
		padding: 16px;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius);
	}

	.head {
		display: grid;
		gap: 6px;
	}

	.back {
		font-size: 0.85rem;
		text-decoration: none;
	}

	.back:hover {
		text-decoration: underline;
	}

	h2 {
		font-size: 1.2rem;
		overflow-wrap: anywhere;
	}

	.field {
		display: grid;
		gap: 6px;
	}

	.label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted);
	}

	.views {
		display: grid;
		gap: 6px;
	}

	.views .btn {
		justify-content: flex-start;
	}

	.views .btn[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg-deep);
	}

	.data {
		display: grid;
		gap: 6px;
		padding-top: 14px;
		border-top: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.data p {
		margin: 0;
		font-size: 0.88rem;
	}

	.hint {
		color: var(--muted);
	}

	.data .hint {
		font-size: 0.8rem;
	}

	@media (max-width: 900px) {
		.views {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		.views .btn {
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.views {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
