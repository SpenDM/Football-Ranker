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

	<div class="content">
		<section class="board" aria-label={active.name}>
			{#if active.kind === 'ranked'}
				<RankedList
					slots={active.slots}
					teams={placement[active.tiers[0].id]}
					onCommit={(abbrs) => rankings.setTier(active, active.tiers[0].id, abbrs)}
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

		<TeamPool {placed} onReturn={(abbrs) => rankings.unplace(active, abbrs)} />
	</div>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}

	.sidebar-slot {
		position: sticky;
		top: calc(var(--banner-height) + 16px);
	}

	.board {
		display: grid;
		gap: 8px;
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

	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.sidebar-slot {
			position: static;
		}
	}
</style>
