<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';

	/** A ranked row in a team's colors, shared by Team and Player mode. */
	let {
		rank,
		teamAbbr,
		name,
		detail,
		score,
		title,
		expanded,
		onclick
	}: {
		rank: number;
		/** Team whose logo and colors the row uses. */
		teamAbbr: string;
		name: string;
		/** Supporting stats, clipped when narrow (the full text is in the tooltip). */
		detail: string;
		score: string;
		/** Tooltip. */
		title: string;
		/** Whether this row's breakdown is showing (clickable rows only). */
		expanded?: boolean;
		/** Makes the row a button. */
		onclick?: () => void;
	} = $props();

	const team = $derived(teamsByAbbr.get(teamAbbr));
</script>

{#snippet cells()}
	<span class="rank">{rank}</span>
	<span class="logo">{#if team}<img src={team.logo} alt="" class:on-color={team.logoOnColor} />{/if}</span>
	<span class="name">{name}</span>
	<span class="detail">{detail}</span>
	<span class="score">{score}</span>
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
		grid-template-columns: 22px 26px minmax(0, auto) minmax(0, 1fr) auto;
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

	.logo img.on-color {
		filter: none;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 600;
		white-space: nowrap;
	}

	/* The name keeps its width where it can; long stats are clipped first (full text in the
	   tooltip). */
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
