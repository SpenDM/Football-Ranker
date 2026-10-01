<script lang="ts">
	import PlayerMode from '$lib/components/PlayerMode.svelte';
	import RosterSidebar from '$lib/components/RosterSidebar.svelte';
	import TeamLookup from '$lib/components/TeamLookup.svelte';
	import TeamMatchups from '$lib/components/TeamMatchups.svelte';
	import TeamRankList from '$lib/components/TeamRankList.svelte';
	import { fantasyTeams, type TeamFantasyStats } from '$lib/data/fantasy';
	import {
		gameBreakdown,
		otherUnit,
		rankIndex,
		rankTeams,
		topAndBottom,
		UNITS
	} from '$lib/fantasy-roster/team-rankings';
	import { rosterMode, rosterTeamView, type TeamView } from '$lib/stores/rosterMode.svelte';

	const teamViews: { id: TeamView; label: string }[] = [
		{ id: 'rankings', label: 'Team Rankings' },
		{ id: 'matchups', label: 'Team Matchups' }
	];

	// The data is fixed at build time, so the rankings only need computing once.
	const ranks = rankIndex(fantasyTeams.teams);
	const views = UNITS.map((view) => ({
		...view,
		categories: view.categories.map((category) => {
			const ranked = rankTeams(fantasyTeams.teams, view.unit, category);
			return {
				...category,
				ranked,
				...topAndBottom(ranked),
				breakdown: (team: TeamFantasyStats) =>
					gameBreakdown(team, view.unit, category.split, ranks),
				// e.g. "rushing defense rank" for the rushing offense lists.
				opponentRankLabel: `${category.split === 'total' ? 'overall' : category.title.toLowerCase()} ${otherUnit(view.unit)} rank`
			};
		})
	}));
</script>

<svelte:head><title>Fantasy Roster Manager · Football Tools</title></svelte:head>

<div class="layout">
	<div class="sidebar-slot"><RosterSidebar /></div>

	<div class="canvas">
		{#if rosterMode.current === 'team'}
			<div class="views" role="group" aria-label="Team view">
				{#each teamViews as v (v.id)}
					<button
						class="btn ghost"
						aria-pressed={rosterTeamView.current === v.id}
						onclick={() => (rosterTeamView.current = v.id)}>{v.label}</button
					>
				{/each}
			</div>
		{/if}
		{#if rosterMode.current === 'team' && rosterTeamView.current === 'matchups'}
			<TeamMatchups />
		{:else if rosterMode.current === 'team'}
			{#each views as view (view.unit)}
				<section class="unit" aria-labelledby="unit-{view.unit}">
					<h2 id="unit-{view.unit}">{view.title}</h2>
					<div class="categories">
						{#each view.categories as category (category.split)}
							{@const name = `${view.unit} ${category.title.toLowerCase()}`}
							<div class="category">
								<div class="category-head">
									<h3>{category.title}</h3>
									<TeamLookup
										label={name}
										ranked={category.ranked}
										detail={category.detail}
										breakdown={category.breakdown}
										opponentRankLabel={category.opponentRankLabel}
									/>
								</div>
								<p class="formula">{category.formula}</p>
								<TeamRankList
									label="Top 10 {name}"
									heading="Top 10"
									entries={category.top}
									detail={category.detail}
									breakdown={category.breakdown}
									opponentRankLabel={category.opponentRankLabel}
								/>
								<TeamRankList
									label="Bottom 10 {name}"
									heading="Bottom 10"
									entries={category.bottom}
									detail={category.detail}
									breakdown={category.breakdown}
									opponentRankLabel={category.opponentRankLabel}
								/>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		{:else}
			<PlayerMode />
		{/if}
	</div>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 216px minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}

	.sidebar-slot {
		position: sticky;
		top: calc(var(--banner-height) + 16px);
	}

	.canvas {
		container-type: inline-size;
		display: grid;
		gap: 28px;
	}

	/* Pulled up so it sits closer to the view below than the canvas gap. */
	.views {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: -14px;
	}

	.views .btn {
		padding: 0.3rem 0.7rem;
		font-weight: 700;
	}

	.views .btn[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg-deep);
	}

	.unit h2 {
		margin-bottom: 10px;
		padding-bottom: 6px;
		font-size: 1.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.categories {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
	}

	@container (min-width: 620px) {
		.categories {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@container (min-width: 960px) {
		.categories {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.category {
		display: grid;
		gap: 8px;
		align-content: start;
	}

	/* Title on the left, Team Lookup on the right edge of the lists below. The lookup's results
	   drop down from here across the whole category, above the lists. */
	.category-head {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 28px;
	}

	.category-head:has(:global(.lookup.active)) {
		z-index: 6;
	}

	h3 {
		font-size: 1rem;
	}

	.formula {
		margin: -4px 0 2px;
		font-size: 0.8rem;
		color: var(--muted);
	}

	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.sidebar-slot {
			position: static;
		}
	}
</style>
