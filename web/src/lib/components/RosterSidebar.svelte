<script lang="ts">
	import {
		rosterMode,
		rosterTeamView,
		type RosterMode,
		type TeamView
	} from '$lib/stores/rosterMode.svelte';

	const modes: { id: RosterMode; label: string }[] = [
		{ id: 'team', label: 'Team' },
		{ id: 'player', label: 'Player' }
	];

	const teamViews: { id: TeamView; label: string }[] = [
		{ id: 'rankings', label: 'Team Rankings' },
		{ id: 'matchups', label: 'Team Matchups' }
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
		{#if rosterMode.current === 'team'}
			<ul class="branches" role="group" aria-label="Team view">
				{#each teamViews as v (v.id)}
					<li>
						<button
							class="btn ghost"
							aria-pressed={rosterTeamView.current === v.id}
							onclick={() => (rosterTeamView.current = v.id)}>{v.label}</button
						>
					</li>
				{/each}
			</ul>
		{/if}
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

	.btn[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg-deep);
	}

	/* A tree hanging from the Team button: a line down from under it, with a tick to each view. */
	.branches {
		--line: color-mix(in srgb, var(--accent) 60%, transparent);
		--indent: 16px;
		margin: -6px 0 0 calc(25% - 4px);
		padding: 0;
		list-style: none;
	}

	.branches li {
		position: relative;
		padding: 6px 0 0 var(--indent);
	}

	/* The trunk: through every item, stopping at the last item's tick. */
	.branches li::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		border-left: 2px solid var(--line);
	}

	.branches li:last-child::before {
		bottom: auto;
		height: calc(6px + 1em);
	}

	.branches li::after {
		content: '';
		position: absolute;
		top: calc(6px + 1em);
		left: 0;
		width: calc(var(--indent) - 4px);
		border-top: 2px solid var(--line);
	}

	.branches .btn {
		width: 100%;
		padding: 0.3rem 0.6rem;
		font-size: 0.88rem;
	}
</style>
