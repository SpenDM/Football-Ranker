<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import type { RankedTeam } from '$lib/fantasy-roster/team-rankings';
	import type { TeamFantasyStats } from '$lib/data/fantasy';

	let {
		label,
		heading,
		entries,
		detail
	}: {
		/** Accessible name, e.g. "Top 10 offense rushing". */
		label: string;
		heading: string;
		entries: RankedTeam[];
		detail: (team: TeamFantasyStats) => string;
	} = $props();
</script>

<div class="list" aria-label={label} role="region">
	<h4>{heading}</h4>
	<ol>
		{#each entries as entry (entry.abbr)}
			{@const team = teamsByAbbr.get(entry.abbr)}
			{@const info = detail(entry.team)}
			<li
				style:--primary={team?.primaryColor}
				style:--secondary={team?.secondaryColor}
				title="#{entry.rank} {team?.name ?? entry.abbr}: {entry.score}{info ? ` (${info} per game)` : ''}"
			>
				<span class="rank">{entry.rank}</span>
				<span class="logo">{#if team}<img src={team.logo} alt="" />{/if}</span>
				<span class="name">{team?.nickname ?? entry.abbr}</span>
				<span class="detail">{info}</span>
				<span class="score">{entry.score.toFixed(1)}</span>
			</li>
		{/each}
	</ol>
</div>

<style>
	.list {
		container-type: inline-size;
		padding: 10px;
		background: var(--bg-deep);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: var(--radius);
	}

	h4 {
		margin: 0 0 6px;
		padding: 0 4px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent-strong);
	}

	ol {
		display: grid;
		gap: 3px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
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
</style>
