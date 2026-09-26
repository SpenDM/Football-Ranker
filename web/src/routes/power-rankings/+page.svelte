<script lang="ts">
	import FrameworkEditor from '$lib/components/FrameworkEditor.svelte';
	import FrameworkSelector from '$lib/components/FrameworkSelector.svelte';
	import RankedList from '$lib/components/RankedList.svelte';
	import TeamPool from '$lib/components/TeamPool.svelte';
	import TierRow from '$lib/components/TierRow.svelte';
	import { placedTeams } from '$lib/power-rankings/placements';
	import { frameworks } from '$lib/stores/frameworks.svelte';
	import { rankings } from '$lib/stores/rankings.svelte';
	import { editorOpen } from '$lib/stores/ui.svelte';

	const active = $derived(frameworks.active);
	const placement = $derived(rankings.for(active));
	const placed = $derived(placedTeams(placement));
</script>

<svelte:head><title>Power Rankings · Football Tools</title></svelte:head>

<FrameworkSelector bind:editing={editorOpen.current} />
{#if editorOpen.current}<FrameworkEditor />{/if}

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
			/>
		{/each}
	{/if}
</section>

<TeamPool {placed} onReturn={(abbrs) => rankings.unplace(active, abbrs)} />

<style>
	.board {
		margin-top: 18px;
		display: grid;
		gap: 8px;
	}
</style>
