<script lang="ts">
	import type { PlayerEntry } from '$lib/fantasy-roster/player-rankings';
	import { setAvailable, unavailable } from '$lib/stores/rosterMode.svelte';

	let { entry }: { entry: PlayerEntry } = $props();

	const available = $derived(!unavailable.current.includes(entry.id));
	const label = $derived(
		available ? `Mark ${entry.name} not available` : `Mark ${entry.name} available`
	);
</script>

<button
	class="toggle"
	class:restore={!available}
	aria-label={label}
	title={label}
	onclick={() => setAvailable(entry.id, !available)}
>
	{#if available}
		<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
	{:else}
		<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
	{/if}
</button>

<style>
	.toggle {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		padding: 0;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: 6px;
		background: var(--surface);
		color: var(--muted);
		cursor: pointer;
	}

	.toggle:hover {
		border-color: #e5484d;
		color: #e5484d;
	}

	.toggle.restore {
		border-color: color-mix(in srgb, #30a46c 60%, transparent);
		color: #30a46c;
	}

	.toggle.restore:hover {
		background: color-mix(in srgb, #30a46c 20%, var(--surface));
	}

	svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
