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
		margin-top: 28px;
		padding: 16px;
		background: var(--bg-deep);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: var(--radius);
	}

	h2 {
		font-size: 1.05rem;
		margin-bottom: 12px;
	}

	h2 span {
		margin-left: 8px;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--muted);
	}

	.divisions {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}

	.division {
		background: var(--surface);
		border-radius: 8px;
		padding: 8px;
		container-type: inline-size;
	}

	h3 {
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent-strong);
		padding: 0 4px 4px;
	}

	/* Fixed height: while a team is dragged over a full division, the drop placeholder would
	   otherwise wrap to a new row and shift the layout under the cursor, cancelling the drop.
	   The extra row is clipped instead. */
	.division :global(.division-zone) {
		display: grid;
		grid-template-columns: repeat(2, var(--card-size));
		justify-content: center;
		height: calc(2 * var(--card-size) + 24px);
		min-height: 0;
		overflow: hidden;
	}

	/* Four across once four cards fit: 4 × 72px + 3 gaps + padding (60px cards on phones). */
	@container (min-width: 330px) {
		.division :global(.division-zone) {
			grid-template-columns: repeat(4, var(--card-size));
			height: calc(var(--card-size) + 16px);
		}
	}

	@media (max-width: 560px) {
		@container (min-width: 280px) {
			.division :global(.division-zone) {
				grid-template-columns: repeat(4, var(--card-size));
				height: calc(var(--card-size) + 16px);
			}
		}
	}

	@media (max-width: 1000px) {
		.divisions {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 420px) {
		.divisions {
			grid-template-columns: 1fr;
		}
	}
</style>
