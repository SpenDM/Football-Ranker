<script lang="ts">
	import RosterSidebar from '$lib/components/RosterSidebar.svelte';
	import TeamRankList from '$lib/components/TeamRankList.svelte';
	import { fantasyTeams } from '$lib/data/fantasy';
	import { rankTeams, topAndBottom, UNITS } from '$lib/fantasy-roster/team-rankings';
	import { rosterMode } from '$lib/stores/rosterMode.svelte';

	// The data is fixed at build time, so the rankings only need computing once.
	const views = UNITS.map((view) => ({
		...view,
		categories: view.categories.map((category) => ({
			...category,
			...topAndBottom(rankTeams(fantasyTeams.teams, view.unit, category))
		}))
	}));
</script>

<svelte:head><title>Fantasy Roster Manager · Football Tools</title></svelte:head>

<div class="layout">
	<div class="sidebar-slot"><RosterSidebar /></div>

	<div class="canvas">
		{#if rosterMode.current === 'team'}
			{#each views as view (view.unit)}
				<section class="unit" aria-labelledby="unit-{view.unit}">
					<h2 id="unit-{view.unit}">{view.title}</h2>
					<div class="categories">
						{#each view.categories as category (category.split)}
							{@const name = `${view.unit} ${category.title.toLowerCase()}`}
							<div class="category">
								<h3>{category.title}</h3>
								<p class="formula">{category.formula}</p>
								<TeamRankList
									label="Top 10 {name}"
									heading="Top 10"
									entries={category.top}
									detail={category.detail}
								/>
								<TeamRankList
									label="Bottom 10 {name}"
									heading="Bottom 10"
									entries={category.bottom}
									detail={category.detail}
								/>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		{:else}
			<section class="soon" aria-label="Player mode">
				<span class="badge">Coming soon</span>
				<h2>Player mode</h2>
				<p>Weekly PPR performance for every quarterback, running back, receiver and tight end.</p>
			</section>
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

	h3 {
		font-size: 1rem;
	}

	.formula {
		margin: -4px 0 2px;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.soon {
		max-width: 680px;
		padding: 28px;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: 14px;
	}

	.soon h2 {
		margin-top: 12px;
		font-size: 1.4rem;
	}

	.soon p {
		color: var(--muted);
	}

	.badge {
		display: inline-block;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--bg-deep);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
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
