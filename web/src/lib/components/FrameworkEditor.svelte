<script lang="ts">
	import { MAX_SLOTS } from '$lib/power-rankings/presets';
	import { frameworks } from '$lib/stores/frameworks.svelte';

	const MAX_TIERS = 12;
	const active = $derived(frameworks.active);
</script>

<section class="editor" aria-label="Edit format">
	{#if frameworks.activeIsPreset}
		<p class="hint">
			Changes to a preset are kept in this browser. Click <strong>Save format</strong> to save
			them as your own framework, or <strong>Reset to default</strong> to undo them.
		</p>
	{:else}
		<label class="field">
			<span>Name</span>
			<input
				type="text"
				maxlength="40"
				value={active.name}
				oninput={(e) => frameworks.renameActive(e.currentTarget.value)}
			/>
		</label>
	{/if}

	{#if active.kind === 'ranked'}
		<label class="field">
			<span>Number of ranks (1–{MAX_SLOTS})</span>
			<input
				type="number"
				min="1"
				max={MAX_SLOTS}
				value={active.slots}
				onchange={(e) => frameworks.setSlots(e.currentTarget.valueAsNumber)}
			/>
		</label>
	{:else}
		<ol class="tiers">
			{#each active.tiers as tier, i (tier.id)}
				<li>
					<input
						type="color"
						aria-label="Color for tier {tier.label}"
						value={tier.color}
						oninput={(e) => frameworks.updateTier(tier.id, { color: e.currentTarget.value })}
					/>
					<input
						type="text"
						aria-label="Tier name"
						maxlength="16"
						value={tier.label}
						oninput={(e) => frameworks.updateTier(tier.id, { label: e.currentTarget.value })}
					/>
					<button
						class="btn ghost icon"
						aria-label="Move {tier.label} up"
						disabled={i === 0}
						onclick={() => frameworks.moveTier(tier.id, -1)}>↑</button
					>
					<button
						class="btn ghost icon"
						aria-label="Move {tier.label} down"
						disabled={i === active.tiers.length - 1}
						onclick={() => frameworks.moveTier(tier.id, 1)}>↓</button
					>
					<button
						class="btn ghost icon danger"
						aria-label="Remove tier {tier.label}"
						disabled={active.tiers.length <= 1}
						onclick={() => frameworks.removeTier(tier.id)}>✕</button
					>
				</li>
			{/each}
		</ol>
		<button class="btn" disabled={active.tiers.length >= MAX_TIERS} onclick={() => frameworks.addTier()}>
			+ Add tier
		</button>
		<p class="hint">Removing a tier sends its teams back to the pool.</p>
	{/if}
</section>

<style>
	.editor {
		margin-top: 14px;
		padding: 14px;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		display: grid;
		gap: 12px;
		justify-items: start;
	}

	.hint {
		margin: 0;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.field {
		display: grid;
		gap: 4px;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.field input {
		color: var(--text);
	}

	.tiers {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
	}

	.tiers li {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	input[type='color'] {
		width: 40px;
		height: 36px;
		padding: 2px;
		border: 1px solid var(--accent);
		border-radius: 8px;
		background: var(--bg-deep);
		cursor: pointer;
	}

	.tiers input[type='text'] {
		width: 140px;
	}

	.icon {
		width: 36px;
		padding: 0;
	}
</style>
