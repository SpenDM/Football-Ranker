<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import type { GameBreakdown } from '$lib/fantasy-roster/team-rankings';

	let {
		games,
		label,
		opponentRankLabel
	}: {
		games: GameBreakdown[];
		/** Accessible name, e.g. "Bears by game". */
		label: string;
		/** What the opponent's rank is in, e.g. "rushing defense rank" (shown on hover). */
		opponentRankLabel: string;
	} = $props();
</script>

<div class="breakdown" role="group" aria-label={label}>
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

<style>
	.breakdown {
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
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
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

</style>
