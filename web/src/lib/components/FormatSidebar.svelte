<script lang="ts">
	import { MAX_CUSTOM_FRAMEWORKS } from '$lib/power-rankings/frameworks';
	import { MAX_SLOTS, RANKED_PRESET_ID } from '$lib/power-rankings/presets';
	import { auth } from '$lib/stores/auth.svelte';
	import { frameworks } from '$lib/stores/frameworks.svelte';
	import { rankings } from '$lib/stores/rankings.svelte';

	/** Shorter button labels for the presets. */
	const PRESET_LABELS: Record<string, string> = { [RANKED_PRESET_ID]: '1–32' };

	let confirming = $state<'clear' | 'delete' | null>(null);
	/** The custom format whose button is currently a name input. */
	let editingId = $state<string | null>(null);
	let draft = $state('');
	let fallbackName = '';

	const active = $derived(frameworks.active);

	function select(id: string) {
		confirming = null;
		if (id === active.id && !frameworks.activeIsPreset) startRename();
		else frameworks.select(id);
	}

	function startRename() {
		editingId = active.id;
		draft = fallbackName = active.name;
	}

	function saveNew() {
		const name = frameworks.activeIsPreset ? `My ${active.name}` : `${active.name} copy`;
		if (frameworks.saveAsCustom(name, auth.user?.uid ?? null)) startRename();
	}

	function commitRename() {
		if (editingId === null) return;
		editingId = null;
		frameworks.renameActive(draft.trim() || fallbackName);
	}

	function onRenameKey(e: KeyboardEvent) {
		if (e.key === 'Enter') commitRename();
		if (e.key === 'Escape') editingId = null;
	}

	function focusAndSelect(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function confirmOrRun(kind: 'clear' | 'delete', run: () => void) {
		if (confirming === kind) {
			run();
			confirming = null;
		} else {
			confirming = kind;
			setTimeout(() => {
				if (confirming === kind) confirming = null;
			}, 4000);
		}
	}
</script>

<aside class="sidebar" aria-label="Format settings">
	<div class="field">
		<span class="label" id="formats-label">Format</span>
		<div class="formats" role="group" aria-labelledby="formats-label">
			{#each frameworks.presets as fw (fw.id)}
				<button class="btn ghost format" aria-pressed={fw.id === active.id} onclick={() => select(fw.id)}
					>{PRESET_LABELS[fw.id] ?? fw.name}</button
				>
			{/each}
			{#each frameworks.customs.current as fw (fw.id)}
				{#if fw.id === editingId}
					<input
						class="rename"
						type="text"
						maxlength="40"
						aria-label="Format name"
						bind:value={draft}
						onkeydown={onRenameKey}
						onblur={commitRename}
						{@attach focusAndSelect}
					/>
				{:else}
					<button
						class="btn ghost format custom"
						aria-pressed={fw.id === active.id}
						title={fw.id === active.id ? 'Click to rename' : undefined}
						onclick={() => select(fw.id)}><span class="name">{fw.name}</span></button
					>
				{/if}
			{/each}
			{#if frameworks.canSaveCustom}
				<button
					class="btn save"
					disabled={!frameworks.canSaveActive}
					title={frameworks.canSaveActive
						? `Save this format and its rankings as one of your formats (${frameworks.customs.current.length}/${MAX_CUSTOM_FRAMEWORKS})${auth.user ? '. Syncs to your account.' : ''}`
						: 'Change this format to save it as a new one'}
					onclick={saveNew}>Save Format</button
				>
			{:else}
				<p class="hint">You've saved {MAX_CUSTOM_FRAMEWORKS} formats. Delete one to save another.</p>
			{/if}
			{#if !frameworks.activeIsPreset}
				<button
					class="btn ghost danger"
					onclick={() => confirmOrRun('delete', () => frameworks.deleteCustom(active.id))}
				>
					{confirming === 'delete' ? 'Confirm delete' : 'Delete Format'}
				</button>
			{/if}
		</div>
	</div>

	{#if active.kind === 'ranked'}
		<div class="field">
			<label class="label" for="format-slots">Number of ranks</label>
			<input
				id="format-slots"
				type="number"
				min="1"
				max={MAX_SLOTS}
				value={active.slots}
				onchange={(e) => frameworks.setSlots(e.currentTarget.valueAsNumber)}
			/>
		</div>
	{/if}

	<div class="actions">
		{#if frameworks.activeIsPreset}
			<button
				class="btn ghost"
				disabled={!frameworks.activeIsModifiedPreset}
				onclick={() => frameworks.resetPreset()}
			>
				Reset to default
			</button>
		{/if}
		<button
			class="btn ghost danger"
			onclick={() => confirmOrRun('clear', () => rankings.clear(active))}
		>
			{confirming === 'clear' ? 'Confirm clear' : 'Clear rankings'}
		</button>
	</div>
</aside>

<style>
	.sidebar {
		/* Whole panel at 90% scale. */
		zoom: 0.9;
		display: grid;
		gap: 14px;
		padding: 16px;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius);
	}

	/* The sidebar is narrow: let long button labels wrap instead of overflowing. */
	.sidebar .btn {
		white-space: normal;
	}

	.field {
		display: grid;
		gap: 6px;
	}

	.label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted);
	}

	.field input {
		width: 100%;
		color: var(--text);
	}

	.formats {
		display: grid;
		gap: 6px;
	}

	.format.custom {
		justify-content: flex-start;
	}

	.name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.format[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg-deep);
	}

	.rename {
		min-height: 36px;
		border-color: var(--accent-strong);
	}

	.save {
		border-style: dashed;
	}

	.hint {
		margin: 0;
		font-size: 0.82rem;
		color: var(--muted);
	}

	.actions {
		display: grid;
		gap: 8px;
		padding-top: 14px;
		border-top: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}
</style>
