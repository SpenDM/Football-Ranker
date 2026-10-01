<script lang="ts">
	import { fantasyTeams } from '$lib/data/fantasy';
	import { teamsByAbbr } from '$lib/data/teams';
	import { upcomingMatchups, type MatchupSide } from '$lib/fantasy-roster/team-matchups';
	import { rankIndex } from '$lib/fantasy-roster/team-rankings';

	// The data is fixed at build time, so the matchups only need computing once.
	const { week, games } = upcomingMatchups(fantasyTeams.teams, rankIndex(fantasyTeams.teams));
</script>

{#snippet side(s: MatchupSide)}
	{@const team = teamsByAbbr.get(s.abbr)}
	<span
		class="team"
		style:--primary={team?.primaryColor}
		style:--secondary={team?.secondaryColor}
		title="{team?.name ?? s.abbr}: offense rank {s.offenseRank}, defense rank {s.defenseRank}"
	>
		<span class="logo">{#if team}<img src={team.logo} alt="" class:on-color={team.logoOnColor} />{/if}</span>
		<span class="name">{team?.nickname ?? s.abbr}</span>
		<span class="ranks"
			><span class="off">Off #{s.offenseRank}</span> · <span class="def">Def #{s.defenseRank}</span></span
		>
	</span>
{/snippet}

<section class="matchups" aria-labelledby="matchups-title">
	<h2 id="matchups-title">{week ? `Week ${week} Matchups` : 'Matchups'}</h2>
	<p class="formula">
		Matchup score: difference in (overall offense rank + overall defense rank). The better team is
		listed first.
	</p>

	{#if games.length}
		<ol aria-label="Week {week} games">
			{#each games as game (game.better.abbr)}
				<li class="game">
					{@render side(game.better)}
					<span class="at">{game.better.home ? 'vs' : '@'}</span>
					{@render side(game.worse)}
					<span class="score" title="Matchup score">{game.score}</span>
				</li>
			{/each}
		</ol>
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

	.team {
		display: grid;
		grid-template-columns: 26px minmax(0, auto) minmax(0, 1fr);
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 3px 8px 3px 4px;
		border-left: 3px solid var(--primary);
		border-radius: 6px;
		background: color-mix(in srgb, var(--primary) 14%, var(--surface));
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
		.team:first-child {
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
