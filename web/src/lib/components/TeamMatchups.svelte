<script lang="ts">
	import { fantasyTeams } from '$lib/data/fantasy';
	import { teamsByAbbr } from '$lib/data/teams';
	import {
		gameResults,
		upcomingMatchups,
		type MatchupSide
	} from '$lib/fantasy-roster/team-matchups';
	import { rankIndex } from '$lib/fantasy-roster/team-rankings';
	import { rosterWeek } from '$lib/stores/rosterMode.svelte';
	import GameResultsPanel from './GameResultsPanel.svelte';

	// The data is fixed at build time, so the ranks only need computing once.
	const ranks = rankIndex(fantasyTeams.teams);
	const { week, games, byes } = $derived(
		upcomingMatchups(fantasyTeams.teams, ranks, rosterWeek.current)
	);
	const statsByAbbr = new Map(fantasyTeams.teams.map((t) => [t.abbr, t]));

	/** The team whose results are open. */
	let open = $state<string | null>(null);
	let listEl = $state<HTMLElement>();

	// Clicking anywhere outside the open team and its results closes them.
	function onPointerDown(e: PointerEvent) {
		const openSide = listEl?.querySelector('.side.open');
		if (openSide && !openSide.contains(e.target as Node)) open = null;
	}
</script>

<svelte:window
	onpointerdown={onPointerDown}
	onkeydown={(e) => {
		if (e.key === 'Escape') open = null;
	}}
/>

{#snippet side(s: MatchupSide)}
	{@const team = teamsByAbbr.get(s.abbr)}
	{@const stats = statsByAbbr.get(s.abbr)}
	<div class="side" class:open={open === s.abbr}>
		<button
			class="team"
			style:--primary={team?.primaryColor}
			style:--secondary={team?.secondaryColor}
			aria-expanded={open === s.abbr}
			title="{team?.name ?? s.abbr}: offense rank {s.offenseRank}, defense rank {s.defenseRank}. Click for each game."
			onclick={() => (open = open === s.abbr ? null : s.abbr)}
		>
			<span class="logo">{#if team}<img src={team.logo} alt="" class:on-color={team.logoOnColor} />{/if}</span>
			<span class="name">{team?.nickname ?? s.abbr}</span>
			<span class="ranks">Off #{s.offenseRank} · Def #{s.defenseRank}</span>
		</button>
		{#if open === s.abbr && stats}
			<div class="popup">
				<GameResultsPanel games={gameResults(stats, week)} label="{team?.nickname ?? s.abbr} by game" />
			</div>
		{/if}
	</div>
{/snippet}

<section class="matchups" aria-labelledby="matchups-title">
	<h2 id="matchups-title">{week ? `Week ${week} Matchups` : 'Matchups'}</h2>
	<p class="formula">
		Matchup score: difference in (overall offense rank + overall defense rank). The better team is
		listed first.
	</p>

	{#if games.length}
		<ol aria-label="Week {week} games" bind:this={listEl}>
			{#each games as game (game.better.abbr)}
				<li class="game">
					{@render side(game.better)}
					<span class="at">{game.better.home ? 'vs' : '@'}</span>
					{@render side(game.worse)}
					<span class="score" title="Matchup score">{game.score}</span>
				</li>
			{/each}
		</ol>
		{#if byes.length}
			<p class="formula">
				Bye: {byes.map((abbr) => teamsByAbbr.get(abbr)?.nickname ?? abbr).join(', ')}
			</p>
		{/if}
	{:else}
		<p class="formula">No upcoming games.</p>
	{/if}
</section>

<style>
	.matchups {
		display: grid;
		gap: 10px;
	}

	h2 {
		padding-bottom: 6px;
		font-size: 1.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.formula {
		margin: 0;
		font-size: 0.8rem;
		color: var(--muted);
	}

	ol {
		display: grid;
		gap: 4px;
		max-width: 760px;
		margin: 0;
		padding: 10px;
		list-style: none;
		background: var(--bg-deep);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: var(--radius);
	}

	.game {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 1.6em minmax(0, 1fr) 2.5em;
		align-items: center;
		gap: 6px;
		font-size: 0.88rem;
	}

	.side {
		position: relative;
		min-width: 0;
	}

	/* Above the rows below, so the open results aren't covered. */
	.side.open {
		z-index: 5;
	}

	.popup {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 1;
	}

	.team {
		display: grid;
		width: 100%;
		border: 0;
		text-align: left;
		font: inherit;
		color: inherit;
		cursor: pointer;
		grid-template-columns: 26px minmax(0, auto) minmax(0, 1fr);
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 3px 8px 3px 4px;
		border-left: 3px solid var(--primary);
		border-radius: 6px;
		background: color-mix(in srgb, var(--primary) 14%, var(--surface));
	}

	.team:hover,
	.team[aria-expanded='true'] {
		background: color-mix(in srgb, var(--primary) 30%, var(--surface));
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

	.ranks {
		overflow: hidden;
		text-align: right;
		text-overflow: ellipsis;
		font-size: 0.76rem;
		color: var(--muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.at {
		text-align: center;
		font-size: 0.76rem;
		color: var(--muted);
	}

	.score {
		text-align: right;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	/* Narrow screens stack the two teams, with vs/@ beside the second and the score beside both. */
	@container (max-width: 560px) {
		.game {
			grid-template-columns: 1.6em minmax(0, 1fr) 2.5em;
			row-gap: 2px;
		}
		.game + .game {
			margin-top: 6px;
		}
		.side:first-child {
			grid-column: 2;
		}
		.at {
			grid-row: 2;
		}
		.score {
			grid-column: 3;
			grid-row: 1 / span 2;
		}
	}
</style>
