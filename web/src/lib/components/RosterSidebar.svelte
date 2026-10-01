<script lang="ts">
	import { rosterMode, type RosterMode } from '$lib/stores/rosterMode.svelte';

	const modes: { id: RosterMode; label: string }[] = [
		{ id: 'team', label: 'Team Rankings' },
		{ id: 'matchups', label: 'Team Matchups' },
		{ id: 'player', label: 'Player Rankings' }
	];
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
		gap: 6px;
	}

	.modes .btn[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg-deep);
	}
</style>
