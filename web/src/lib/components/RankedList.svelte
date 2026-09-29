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

	/* Rows of 8 slots that fill the board's width, capped so four rows fit in the window. */
	.slots {
		--slot-max: max(64px, calc((100vh - 260px) / 4 - 26px));
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: 10px 12px;
		max-width: calc(8 * var(--slot-max) + 7 * 12px);
		margin: 0 auto;
		padding: 0;
		list-style: none;
	}

	/* 4 per row on narrow screens. */
	@container (max-width: 480px) {
		.slots {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
