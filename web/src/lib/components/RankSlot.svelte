<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME, type DndEvent } from 'svelte-dnd-action';
	import TeamCard from './TeamCard.svelte';

	type Item = { id: string; [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean };

	let {
		rank,
		team,
		onDrop
	}: {
		rank: number;
		/** Team abbreviation in this slot, or '' when empty. */
		team: string;
		/** A team was dropped here. */
		onDrop: (abbr: string) => void;
	} = $props();

	let items = $state<Item[]>([]);
	$effect.pre(() => {
		items = team ? [{ id: team }] : [];
	});

	// While a team hovers over an occupied slot, the occupant is dimmed to preview the swap.
	const previewing = $derived(items.some((i) => i[SHADOW_ITEM_MARKER_PROPERTY_NAME]) && items.length > 1);

	function consider(e: CustomEvent<DndEvent<Item>>) {
		items = e.detail.items;
	}

	function finalize(e: CustomEvent<DndEvent<Item>>) {
		items = e.detail.items;
		const dragged = e.detail.info.id;
		// The slot a team left finalizes with it missing; the slot it landed in does the move.
		if (items.some((i) => i.id === dragged)) onDrop(dragged);
		items = team ? [{ id: team }] : [];
	}
</script>

<div class="slot" class:filled={items.length > 0}>
	<span class="number" aria-hidden="true">{rank}</span>
	<div
		class="zone"
		aria-label="Rank {rank}"
		use:dndzone={{
			items,
			type: 'team',
			flipDurationMs: 0,
			dropTargetStyle: { outline: '2px dashed var(--accent-strong)', outlineOffset: '2px' },
			delayTouchStart: true
		}}
		onconsider={consider}
		onfinalize={finalize}
	>
		{#each items as item (item.id)}
			{@const t = teamsByAbbr.get(item.id)}
			<div class="item" class:dim={previewing && !item[SHADOW_ITEM_MARKER_PROPERTY_NAME]}>
				{#if t}<TeamCard team={t} {rank} />{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.slot {
		position: relative;
		width: var(--card-size);
		height: var(--card-size);
		border: 2px dashed color-mix(in srgb, var(--accent) 45%, transparent);
		border-radius: 10px;
	}

	.slot.filled {
		border-color: transparent;
	}

	.number {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: var(--muted);
		font-size: 1.3rem;
		font-weight: 700;
		pointer-events: none;
	}

	.zone {
		position: absolute;
		inset: -2px;
		display: grid;
		border-radius: 10px;
	}

	/* The occupant and an incoming team's placeholder share the one cell. */
	.item {
		grid-area: 1 / 1;
		transition: opacity 0.12s;
	}

	.item.dim {
		opacity: 0.35;
	}
</style>
