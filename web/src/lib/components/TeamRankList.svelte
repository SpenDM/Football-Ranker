<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import type { GameBreakdown, RankedTeam } from '$lib/fantasy-roster/team-rankings';
	import type { TeamFantasyStats } from '$lib/data/fantasy';

	let {
		label,
		heading,
		entries,
		detail,
		breakdown,
		opponentRankLabel
	}: {
		/** Accessible name, e.g. "Top 10 offense rushing". */
		label: string;
		heading: string;
		entries: RankedTeam[];
		detail: (team: TeamFantasyStats) => string;
		/** A team's game-by-game scores in this category, shown when its row is clicked. */
		breakdown: (team: TeamFantasyStats) => GameBreakdown[];
		/** What the opponent's rank is in, e.g. "rushing defense rank" (shown on hover). */
		opponentRankLabel: string;
	} = $props();

	/** The team whose game breakdown is open. */
	let open = $state<string | null>(null);
	let listEl: HTMLElement;

	// Clicking anywhere outside the open row and its breakdown closes it.
	function onPointerDown(e: PointerEvent) {
		const openItem = listEl.querySelector('.item.open');
		if (openItem && !openItem.contains(e.target as Node)) open = null;
	}
</script>

<svelte:window
	onpointerdown={onPointerDown}
	onkeydown={(e) => {
		if (e.key === 'Escape') open = null;
	}}
/>

<div class="list" class:has-open={open} aria-label={label} role="region" bind:this={listEl}>
	<h4>{heading}</h4>
	<ol>
		{#each entries as entry (entry.abbr)}
			{@const team = teamsByAbbr.get(entry.abbr)}
			{@const info = detail(entry.team)}
			{@const name = team?.nickname ?? entry.abbr}
			<li class="item" class:open={open === entry.abbr}>
				<button
					class="row"
					style:--primary={team?.primaryColor}
					style:--secondary={team?.secondaryColor}
					aria-expanded={open === entry.abbr}
					title="#{entry.rank} {team?.name ?? entry.abbr}: {entry.score}{info
						? ` (${info} per game)`
						: ''}. Click for each game."
					onclick={() => (open = open === entry.abbr ? null : entry.abbr)}
				>
					<span class="rank">{entry.rank}</span>
					<span class="logo">{#if team}<img src={team.logo} alt="" />{/if}</span>
					<span class="name">{name}</span>
					<span class="detail">{info}</span>
					<span class="score">{entry.score.toFixed(1)}</span>
				</button>
				{#if open === entry.abbr}
					{@const games = breakdown(entry.team)}
					<div class="breakdown" role="group" aria-label="{name} by game">
						<ol>
							{#each games as game (game.week)}
								{@const opp = teamsByAbbr.get(game.opponent)}
								<li>
									<span class="week">Wk {game.week}</span>
									<span class="matchup"
										>{game.home ? 'vs' : '@'}
										{#if opp}<img src={opp.logo} alt="" />{/if}<span class="opp-name"
											>{opp?.nickname ?? game.opponent}</span
										></span
									>
									<span class="opp-rank" title="{opponentRankLabel} {game.opponentRank ?? '–'}"
										>#{game.opponentRank ?? '–'}</span
									>
									<span class="game-score">{game.score.toFixed(1)}</span>
								</li>
							{/each}
						</ol>
					</div>
				{/if}
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

	/* Above the lists that follow it, so an open breakdown isn't covered. */
	.list.has-open {
		position: relative;
		z-index: 5;
	}

	.item {
		position: relative;
	}

	.row {
		display: grid;
		width: 100%;
		border: 0;
		text-align: left;
		cursor: pointer;
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

	.row:hover,
	.item.open .row {
		background: color-mix(in srgb, var(--primary) 30%, var(--surface));
	}

	.breakdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 1;
		padding: 8px 10px;
		background: var(--surface-2);
		border: 1px solid var(--accent-strong);
		border-radius: 8px;
		box-shadow: 0 10px 24px rgb(0 0 0 / 0.5);
		font-size: 0.85rem;
	}

	/* Week | opponent | opponent's rank | score. Rows share the list's columns (subgrid) so the
	   ranks line up right after the longest opponent name. */
	.breakdown ol {
		grid-template-columns: 40px minmax(0, auto) auto 1fr;
		gap: 6px 10px;
	}

	.breakdown li {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		align-items: center;
		min-height: 26px;
	}

	.week {
		font-weight: 700;
		color: var(--muted);
	}

	.matchup {
		display: flex;
		align-items: center;
		gap: 5px;
		min-width: 0;
		font-weight: 600;
	}

	.opp-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.matchup img {
		width: 18px;
		height: 18px;
		object-fit: contain;
	}

	.opp-rank {
		color: var(--muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.game-score {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		text-align: right;
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
