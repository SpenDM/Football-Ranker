<script lang="ts">
	import { TIER_COLORS } from '$lib/power-rankings/presets';
	import type { Tier } from '$lib/power-rankings/types';
	import TeamZone from './TeamZone.svelte';

	let {
		tier,
		teams,
		onCommit,
		onEdit
	}: {
		tier: Tier;
		teams: string[];
		onCommit: (abbrs: string[]) => void;
		onEdit: (patch: Partial<Omit<Tier, 'id'>>) => void;
	} = $props();

	let editing = $state(false);
	let labelCell: HTMLElement;
	let nameInput = $state<HTMLInputElement>();

	$effect(() => {
		if (editing) nameInput?.select();
	});

	function close() {
		if (!tier.label.trim()) onEdit({ label: 'Tier' });
		editing = false;
	}

	function onWindowPointerDown(e: PointerEvent) {
		if (editing && !labelCell.contains(e.target as Node)) close();
	}
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<div class="row">
	<div class="label" style:background={tier.color} bind:this={labelCell}>
		<button
			class="label-btn"
			title="Edit tier name and color"
			aria-label="Edit tier {tier.label}"
			aria-expanded={editing}
			onclick={() => (editing ? close() : (editing = true))}
		>
			{tier.label}
		</button>

		{#if editing}
			<div
				class="popover"
				role="dialog"
				aria-label="Edit tier {tier.label}"
				tabindex="-1"
				onkeydown={(e) => {
					if (e.key === 'Escape' || e.key === 'Enter') {
						e.preventDefault();
						close();
					}
				}}
			>
				<label>
					<span>Name</span>
					<input
						bind:this={nameInput}
						type="text"
						maxlength="16"
						value={tier.label}
						oninput={(e) => onEdit({ label: e.currentTarget.value })}
					/>
				</label>
				<div class="colors" role="group" aria-label="Color">
					{#each TIER_COLORS as color (color)}
						<button
							class="swatch"
							style:background={color}
							aria-label="Color {color}"
							aria-pressed={tier.color.toLowerCase() === color}
							onclick={() => onEdit({ color })}
						></button>
					{/each}
					<label class="swatch custom" title="Custom color">
						<span class="visually-hidden">Custom color</span>
						<input
							type="color"
							value={tier.color}
							oninput={(e) => onEdit({ color: e.currentTarget.value })}
						/>
					</label>
				</div>
				<button class="btn" onclick={close}>Done</button>
			</div>
		{/if}
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
	}

	.label {
		position: relative;
		border-radius: calc(var(--radius) - 1px) 0 0 calc(var(--radius) - 1px);
	}

	.label-btn {
		width: 100%;
		height: 100%;
		min-height: calc(var(--card-size) + 16px);
		padding: 6px;
		border: none;
		background: transparent;
		color: #111;
		font-weight: 800;
		font-size: 1.35rem;
		text-align: center;
		word-break: break-word;
		cursor: pointer;
	}

	.label-btn:hover {
		background: rgb(255 255 255 / 0.18);
	}

	.popover {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 30;
		width: 240px;
		padding: 12px;
		display: grid;
		gap: 10px;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		box-shadow: 0 10px 28px rgb(0 0 0 / 0.55);
	}

	.popover label {
		display: grid;
		gap: 4px;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.popover input[type='text'] {
		color: var(--text);
	}

	.colors {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
	}

	.swatch {
		position: relative;
		aspect-ratio: 1;
		border: 2px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		padding: 0;
	}

	.swatch[aria-pressed='true'] {
		border-color: var(--text);
		box-shadow: 0 0 0 2px var(--bg-deep) inset;
	}

	.swatch.custom {
		display: block;
		overflow: hidden;
		background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
	}

	.swatch.custom input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.row :global(.tier-zone) {
		border-radius: 0;
	}

	@media (max-width: 560px) {
		.row {
			grid-template-columns: 64px 1fr;
		}
		.label-btn {
			font-size: 1rem;
		}
	}
</style>
