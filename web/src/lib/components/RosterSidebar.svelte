<script lang="ts">
	import { fantasyTeams } from '$lib/data/fantasy';
	import { rosterMode, type RosterMode } from '$lib/stores/rosterMode.svelte';

	const modes: { id: RosterMode; label: string }[] = [
		{ id: 'team', label: 'Team' },
		{ id: 'player', label: 'Player' }
	];

	const { season, throughWeek, weekComplete } = fantasyTeams;
</script>

<aside class="sidebar" aria-label="Roster settings">
	<div class="field">
		<span class="label" id="modes-label">Modes</span>
		<div class="modes" role="group" aria-labelledby="modes-label">
			{#each modes as mode (mode.id)}
				<button
					class="btn ghost"
					aria-pressed={rosterMode.current === mode.id}
					onclick={() => (rosterMode.current = mode.id)}>{mode.label}</button
				>
			{/each}
		</div>
	</div>

	<div class="data">
		<span class="label">Data</span>
		<p>
			{season} regular season{throughWeek ? `, through Week ${throughWeek}` : ': no games yet'}.
			{#if throughWeek && !weekComplete}<span class="partial">Some Week {throughWeek} games aren't in yet.</span
				>{/if}
		</p>
		<p class="hint">
			Updated every Tuesday during the season from
			<a href="https://github.com/nflverse" target="_blank" rel="noopener">nflverse</a>. PPR
			scoring. Scores are per game played, so byes don't count against a team.
		</p>
	</div>
</aside>

<style>
	.sidebar {
		/* Whole panel at 90% scale, like the Power Rankings sidebar. */
		zoom: 0.9;
		display: grid;
		gap: 14px;
		padding: 16px;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius);
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

	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.modes .btn[aria-pressed='true'] {
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

	.partial,
	.hint {
		color: var(--muted);
	}

	.data .hint {
		font-size: 0.8rem;
	}
</style>
