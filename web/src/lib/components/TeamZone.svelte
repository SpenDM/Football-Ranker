<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import TeamCard from './TeamCard.svelte';

	type Item = { id: string };

	let {
		teams,
		onCommit,
		label,
		class: className = ''
	}: {
		/** Team abbreviations currently in this zone. */
		teams: string[];
		/** Called with the zone's teams after a drop. */
		onCommit: (abbrs: string[]) => void;
		label: string;
		class?: string;
	} = $props();

	const flipDurationMs = 150;

	let items = $state<Item[]>([]);
	$effect.pre(() => {
		items = teams.map((id) => ({ id }));
	});

	function consider(e: CustomEvent<DndEvent<Item>>) {
		items = e.detail.items;
	}

	function finalize(e: CustomEvent<DndEvent<Item>>) {
		items = e.detail.items;
		onCommit(items.map((i) => i.id));
		// Re-sync with the store, which may reorder (e.g. the pool keeps canonical order).
		items = teams.map((id) => ({ id }));
	}
</script>

<div
	class="zone {className}"
	aria-label={label}
	use:dndzone={{
		items,
		type: 'team',
		flipDurationMs,
		dropTargetStyle: { outline: '2px dashed var(--accent-strong)', outlineOffset: '2px' },
		delayTouchStart: true
	}}
	onconsider={consider}
	onfinalize={finalize}
>
	{#each items as item (item.id)}
		{@const team = teamsByAbbr.get(item.id)}
		<div class="item" animate:flip={{ duration: flipDurationMs }}>
			{#if team}<TeamCard {team} />{/if}
		</div>
	{/each}
</div>

<style>
	.zone {
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 8px;
		min-height: calc(var(--card-size) + 16px);
		padding: 8px;
		border-radius: 8px;
	}

	.item {
		width: var(--card-size);
		height: var(--card-size);
	}
</style>
