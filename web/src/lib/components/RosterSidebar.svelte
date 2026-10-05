<script lang="ts">
	import { fantasyTeams } from '$lib/data/fantasy';
	import { resolveWeek, upcomingWeeks } from '$lib/fantasy-roster/schedule';
	import { rosterMode, rosterWeek, type RosterMode } from '$lib/stores/rosterMode.svelte';

	const modes: { id: RosterMode; label: string }[] = [
		{ id: 'team', label: 'Team Rankings' },
		{ id: 'matchups', label: 'Team Matchups' },
		{ id: 'player', label: 'Player Rankings' }
	];

	// The data is fixed at build time, so the weeks only need working out once.
	const weeks = upcomingWeeks(fantasyTeams.teams);
	const currentWeek = weeks[0] ?? null;
	const week = $derived(resolveWeek(fantasyTeams.teams, rosterWeek.current));
	const index = $derived(week === null ? -1 : weeks.indexOf(week));

	function choose(w: number | undefined) {
		if (w === undefined) return;
		// The current week is the default, so choosing it goes back to following it.
		rosterWeek.current = w === currentWeek ? null : w;
	}
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

	{#if rosterMode.current !== 'team' && week !== null}
		<div class="field">
			<label class="label" for="roster-week">Week</label>
			<div class="week">
				<button
					class="btn ghost step"
					aria-label="Previous week"
					disabled={index <= 0}
					onclick={() => choose(weeks[index - 1])}>‹</button
				>
				<select
					id="roster-week"
					value={week}
					onchange={(e) => choose(Number(e.currentTarget.value))}
				>
					{#each weeks as w (w)}
						<option value={w}>Week {w}{w === currentWeek ? ' (current)' : ''}</option>
					{/each}
				</select>
				<button
					class="btn ghost step"
					aria-label="Next week"
					disabled={index >= weeks.length - 1}
					onclick={() => choose(weeks[index + 1])}>›</button
				>
			</div>
			{#if week !== currentWeek}
				<button class="link" onclick={() => (rosterWeek.current = null)}
					>Back to Week {currentWeek}</button
				>
			{/if}
		</div>
	{/if}
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

	.week {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 6px;
	}

	.week select {
		min-width: 0;
		padding: 0.35rem 0.4rem;
		font: inherit;
		font-weight: 600;
		color: var(--text);
		background: var(--surface-2);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: 6px;
	}

	.week .step {
		padding: 0.3rem 0.6rem;
		font-weight: 700;
	}

	.link {
		justify-self: start;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-size: 0.8rem;
		color: var(--accent-strong);
		text-decoration: underline;
		cursor: pointer;
	}

	.modes .btn[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg-deep);
	}
</style>
