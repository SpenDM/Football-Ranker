<script lang="ts">
	import TeamZone from './TeamZone.svelte';

	let {
		slots,
		teams,
		onCommit
	}: { slots: number; teams: string[]; onCommit: (abbrs: string[]) => void } = $props();
</script>

<div class="ranked">
	<!-- Numbered empty slots sit underneath the drop zone, which uses the identical grid. -->
	<ol class="slots" aria-hidden="true">
		{#each { length: slots }, i (i)}
			<li>{i + 1}</li>
		{/each}
	</ol>
	<TeamZone
		class="ranked-zone"
		label="Ranking, {teams.length} of {slots} slots filled"
		showRank
		dropDisabled={teams.length >= slots}
		{teams}
		{onCommit}
	/>
</div>

<style>
	.ranked {
		position: relative;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius);
		padding: 8px;
	}

	.slots,
	.ranked :global(.ranked-zone) {
		display: grid;
		grid-template-columns: repeat(auto-fill, var(--card-size));
		justify-content: start;
		gap: 14px;
		padding: 10px;
		margin: 0;
		list-style: none;
	}

	.ranked :global(.ranked-zone) {
		position: absolute;
		inset: 8px;
		min-height: 0;
	}

	.slots li {
		width: var(--card-size);
		height: var(--card-size);
		border: 2px dashed color-mix(in srgb, var(--accent) 45%, transparent);
		border-radius: 10px;
		display: grid;
		place-items: center;
		color: var(--muted);
		font-size: 1.3rem;
		font-weight: 700;
	}
</style>
