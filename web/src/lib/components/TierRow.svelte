<script lang="ts">
	import type { Tier } from '$lib/power-rankings/types';
	import TeamZone from './TeamZone.svelte';

	let {
		tier,
		teams,
		onCommit
	}: { tier: Tier; teams: string[]; onCommit: (abbrs: string[]) => void } = $props();
</script>

<div class="row">
	<div class="label" style:background={tier.color}>
		<span>{tier.label}</span>
	</div>
	<TeamZone class="tier-zone" label="Tier {tier.label}" {teams} {onCommit} />
</div>

<style>
	.row {
		display: grid;
		grid-template-columns: 96px 1fr;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.label {
		display: grid;
		place-items: center;
		padding: 6px;
		color: #111;
		font-weight: 800;
		font-size: 1.35rem;
		text-align: center;
		word-break: break-word;
	}

	.row :global(.tier-zone) {
		border-radius: 0;
	}

	@media (max-width: 560px) {
		.row {
			grid-template-columns: 64px 1fr;
		}
		.label {
			font-size: 1rem;
		}
	}
</style>
