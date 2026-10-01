<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import type { GameResult } from '$lib/fantasy-roster/team-matchups';

	/** A team's win/loss and final score by week, styled like GameBreakdownPanel. */
	let {
		games,
		label
	}: {
		games: GameResult[];
		/** Accessible name, e.g. "Bears by game". */
		label: string;
	} = $props();

	const OUTCOMES = { W: 'Win', L: 'Loss', T: 'Tie' };
</script>

<div class="breakdown" role="group" aria-label={label}>
	<ol>
		{#each games as game (game.week)}
			{@const opp = teamsByAbbr.get(game.opponent)}
			<li class:upcoming={!game.result}>
				<span class="week">Wk {game.week}</span>
				<span class="matchup"
					>{game.home ? 'vs' : '@'}
					{#if opp}<img src={opp.logo} alt="" />{/if}<span class="opp-name"
						>{opp?.nickname ?? game.opponent}</span
					></span
				>
				{#if game.result}
					<span
						class="outcome"
						class:win={game.result.outcome === 'W'}
						class:loss={game.result.outcome === 'L'}
						title={OUTCOMES[game.result.outcome]}>{game.result.outcome}</span
					>
					<span class="game-score">{game.result.pointsFor}–{game.result.pointsAgainst}</span>
				{:else}
					<span class="outcome"></span>
					<span class="game-score">UPCOMING</span>
				{/if}
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

	/* Week | opponent | W/L/T | final score. Rows share the list's columns (subgrid) so the
	   results line up right after the longest opponent name. */
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

	.outcome {
		min-width: 1em;
		font-weight: 700;
		text-align: center;
		color: var(--muted);
	}

	.outcome.win {
		color: #30a46c;
	}

	.outcome.loss {
		color: var(--danger);
	}

	.game-score {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.upcoming .game-score {
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		color: var(--accent);
	}
</style>
