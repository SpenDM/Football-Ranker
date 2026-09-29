<script lang="ts">
	import type { TeamFantasyStats } from '$lib/data/fantasy';
	import { teamsByAbbr } from '$lib/data/teams';
	import type { RankedTeam } from '$lib/fantasy-roster/team-rankings';

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
	const title = $derived(
		`#${entry.rank} ${team?.name ?? entry.abbr}: ${entry.score}${info ? ` (${info} per game)` : ''}`
	);
</script>

{#snippet cells()}
	<span class="rank">{entry.rank}</span>
	<span class="logo">{#if team}<img src={team.logo} alt="" />{/if}</span>
	<span class="name">{team?.nickname ?? entry.abbr}</span>
	<span class="detail">{info}</span>
	<span class="score">{entry.score.toFixed(1)}</span>
{/snippet}

{#if onclick}
	<button
		class="row clickable"
		class:expanded
		style:--primary={team?.primaryColor}
		style:--secondary={team?.secondaryColor}
		aria-expanded={expanded}
		title="{title}. Click for each game."
		{onclick}>{@render cells()}</button
	>
{:else}
	<div
		class="row"
		style:--primary={team?.primaryColor}
		style:--secondary={team?.secondaryColor}
		{title}
	>
		{@render cells()}
	</div>
{/if}

<style>
	.row {
		box-sizing: border-box;
		display: grid;
		width: 100%;
		border: 0;
		text-align: left;
		color: inherit;
		grid-template-columns: 22px 26px auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 3px 8px 3px 4px;
		border-left: 3px solid var(--primary);
		border-radius: 6px;
		background: color-mix(in srgb, var(--primary) 14%, var(--surface));
		font-size: 0.88rem;
	}

	.rank {
		text-align: right;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}

	.logo {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		border: 1px solid var(--secondary);
		background: var(--primary);
	}

	.logo img {
		width: 20px;
		height: 20px;
		object-fit: contain;
		filter: drop-shadow(0 0 1px rgb(255 255 255 / 0.9));
	}

	.name {
		font-weight: 600;
		white-space: nowrap;
	}

	/* The team name keeps its width; long stats are clipped instead (full text in the tooltip). */
	.detail {
		overflow: hidden;
		text-align: right;
		text-overflow: ellipsis;
		font-size: 0.76rem;
		color: var(--muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.score {
		min-width: 3.5em;
		text-align: right;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	/* Narrow lists keep the score and drop the supporting stats (still in the tooltip). */
	@container (max-width: 330px) {
		.detail {
			display: none;
		}
	}

	.clickable {
		cursor: pointer;
	}

	.clickable:hover,
	.expanded {
		background: color-mix(in srgb, var(--primary) 30%, var(--surface));
	}
</style>
