<script lang="ts">
	import RankSlot from './RankSlot.svelte';

	let {
		slots,
		teams,
		onDrop
	}: {
		slots: number;
		/** Positional: teams[i] holds rank i + 1 ('' = empty). */
		teams: string[];
		onDrop: (index: number, abbr: string) => void;
	} = $props();
</script>

<div class="ranked">
	<ol class="slots" aria-label="Ranking, {teams.filter(Boolean).length} of {slots} slots filled">
		{#each { length: slots }, i (i)}
			<li><RankSlot rank={i + 1} team={teams[i] ?? ''} onDrop={(abbr) => onDrop(i, abbr)} /></li>
		{/each}
	</ol>
</div>

<style>
	.ranked {
		container-type: inline-size;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius);
		padding: 14px;
	}

	.slots {
		display: grid;
		grid-template-columns: repeat(4, var(--card-size));
		gap: 12px 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Rows of 8 wherever 8 cards fit (8 × 72px + 7 gaps); 4 per row on narrow screens. */
	@container (min-width: 646px) {
		.slots {
			grid-template-columns: repeat(8, var(--card-size));
		}
	}
</style>
