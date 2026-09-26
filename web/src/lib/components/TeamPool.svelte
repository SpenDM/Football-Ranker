<script lang="ts">
	import { teamsByDivision } from '$lib/data/teams';
	import TeamZone from './TeamZone.svelte';

	let {
		placed,
		onReturn
	}: { placed: Set<string>; onReturn: (abbrs: string[]) => void } = $props();

	const remaining = $derived(
		teamsByDivision.map(({ division, teams }) => ({
			division,
			abbrs: teams.map((t) => t.abbr).filter((a) => !placed.has(a))
		}))
	);
</script>

<section class="pool" aria-labelledby="pool-heading">
	<h2 id="pool-heading">Teams <span>{32 - placed.size} unranked</span></h2>
	<div class="divisions">
		{#each remaining as group (group.division)}
			<div class="division">
				<h3>{group.division}</h3>
				<TeamZone class="division-zone" label="{group.division} pool" teams={group.abbrs} onCommit={onReturn} />
			</div>
		{/each}
	</div>
</section>

<style>
	.pool {
		container-type: inline-size;
		padding: 12px;
		background: var(--bg-deep);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: var(--radius);
	}

	h2 {
		font-size: 1rem;
		margin-bottom: 8px;
	}

	h2 span {
		margin-left: 6px;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--muted);
	}

	/* 2 or 4 divisions per row, so each conference's North/East/South/West stay together. */
	.divisions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px 10px;
	}

	@container (min-width: 670px) {
		.divisions {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.division {
		container-type: inline-size;
	}

	h3 {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent-strong);
		padding: 0 4px 2px;
	}

	/* Fixed height: while a team is dragged over a full division, the drop placeholder would
	   otherwise wrap to a new row and shift the layout under the cursor, cancelling the drop.
	   The extra row is clipped instead. */
	.division :global(.division-zone) {
		display: grid;
		grid-template-columns: repeat(2, var(--card-size));
		gap: 8px;
		padding: 4px;
		height: calc(2 * var(--card-size) + 16px);
		min-height: 0;
		overflow: hidden;
	}

	/* Four across once four cards fit: 4 × 72px + 3 gaps + padding (60px cards on phones). */
	@container (min-width: 320px) {
		.division :global(.division-zone) {
			grid-template-columns: repeat(4, var(--card-size));
			height: calc(var(--card-size) + 8px);
		}
	}

	@media (max-width: 560px) {
		@container (min-width: 272px) {
			.division :global(.division-zone) {
				grid-template-columns: repeat(4, var(--card-size));
				height: calc(var(--card-size) + 8px);
			}
		}
	}
</style>
