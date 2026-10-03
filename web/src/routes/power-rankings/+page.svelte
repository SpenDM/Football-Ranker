<script lang="ts">
	import FormatSidebar from '$lib/components/FormatSidebar.svelte';
	import RankedList from '$lib/components/RankedList.svelte';
	import TeamPool from '$lib/components/TeamPool.svelte';
	import TierRow from '$lib/components/TierRow.svelte';
	import { MAX_TIERS } from '$lib/power-rankings/presets';
	import { placedTeams } from '$lib/power-rankings/placements';
	import { frameworks } from '$lib/stores/frameworks.svelte';
	import { rankings } from '$lib/stores/rankings.svelte';

	const active = $derived(frameworks.active);
	const placement = $derived(rankings.for(active));
	const placed = $derived(placedTeams(placement));
</script>

<svelte:head><title>Power Rankings · Football Tools</title></svelte:head>

<div class="layout">
	<div class="sidebar-slot"><FormatSidebar /></div>

	<section class="board" aria-label={active.name}>
		{#if active.kind === 'ranked'}
			<RankedList
				slots={active.slots}
				teams={placement[active.tiers[0].id]}
				onDrop={(index, abbr) => rankings.placeAt(active, index, abbr)}
			/>
		{:else}
			{#each active.tiers as tier (tier.id)}
				<TierRow
					{tier}
					teams={placement[tier.id]}
					onCommit={(abbrs) => rankings.setTier(active, tier.id, abbrs)}
					onEdit={(patch) => frameworks.updateTier(tier.id, patch)}
				/>
			{/each}
			<div class="tier-controls">
				<button
					class="btn ghost small"
					aria-label="Add tier"
					title="Add a tier at the bottom"
					disabled={active.tiers.length >= MAX_TIERS}
					onclick={() => frameworks.addTier()}>+</button
				>
				<button
					class="btn ghost small"
					aria-label="Remove bottom tier"
					title="Remove the bottom tier (its teams go back to the pool)"
					disabled={active.tiers.length <= 1}
					onclick={() => frameworks.removeTier(active.tiers[active.tiers.length - 1].id)}
					>−</button
				>
			</div>
		{/if}
	</section>

	<div class="pool-slot">
		<TeamPool {placed} onReturn={(abbrs) => rankings.unplace(active, abbrs)} />
	</div>
</div>

<style>
	/* Sidebar | board | teams. The teams column fits two divisions of 2×2 cards, sized so all
	   32 teams fit in the window: banner, page padding, pool padding and 4 division headers take
	   about 290px; the rest is 8 rows of cards. */
	.layout {
		--pool-card: clamp(36px, calc((100vh - 290px) / 8), 72px);
		display: grid;
		grid-template-columns: 162px minmax(0, 1fr) calc(4 * var(--pool-card) + 70px);
		grid-template-areas: 'side board pool';
		gap: 20px;
		align-items: start;
	}

	.sidebar-slot {
		grid-area: side;
		position: sticky;
		top: 16px;
	}

	.board {
		grid-area: board;
		display: grid;
		gap: 8px;
	}

	.pool-slot {
		--card-size: var(--pool-card);
		grid-area: pool;
		position: sticky;
		top: 16px;
	}

	.tier-controls {
		display: flex;
		gap: 6px;
	}

	.small {
		width: 32px;
		min-height: 28px;
		padding: 0;
		font-size: 1.1rem;
		line-height: 1;
	}

	/* Too narrow for three columns: teams move under the board at full size. */
	@media (max-width: 1149px) {
		.layout {
			--pool-card: var(--card-size);
			grid-template-columns: 162px minmax(0, 1fr);
			grid-template-areas: 'side board' 'side pool';
		}
		.pool-slot {
			position: static;
		}
	}

	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: 'side' 'board' 'pool';
		}
		.sidebar-slot {
			position: static;
		}
	}
</style>
