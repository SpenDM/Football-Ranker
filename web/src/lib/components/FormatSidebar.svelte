<script lang="ts">
	import { MAX_CUSTOM_FRAMEWORKS } from '$lib/power-rankings/frameworks';
	import { MAX_SLOTS } from '$lib/power-rankings/presets';
	import { auth } from '$lib/stores/auth.svelte';
	import { frameworks } from '$lib/stores/frameworks.svelte';
	import { rankings } from '$lib/stores/rankings.svelte';

	let dialog: HTMLDialogElement;
	let newName = $state('');
	let confirming = $state<'clear' | 'delete' | null>(null);

	const active = $derived(frameworks.active);
	const customCount = $derived(frameworks.customs.current.length);

	function openSave() {
		newName = frameworks.activeIsPreset ? `My ${active.name}` : `${active.name} copy`;
		dialog.showModal();
	}

	function save(e: SubmitEvent) {
		e.preventDefault();
		if (!newName.trim()) return;
		frameworks.saveAsCustom(newName, auth.user?.uid ?? null);
		dialog.close();
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
		<label for="format-select">Format</label>
		<select
			id="format-select"
			value={active.id}
			onchange={(e) => {
				frameworks.select(e.currentTarget.value);
				confirming = null;
			}}
		>
			<optgroup label="Presets">
				{#each frameworks.presets as fw (fw.id)}
					<option value={fw.id}>{fw.name}{frameworks.presetEdits.current[fw.id] ? ' (modified)' : ''}</option>
				{/each}
			</optgroup>
			<optgroup label="My formats ({customCount}/{MAX_CUSTOM_FRAMEWORKS})">
				{#each frameworks.customs.current as fw (fw.id)}
					<option value={fw.id}>{fw.name}</option>
				{:else}
					<option disabled>None saved yet</option>
				{/each}
			</optgroup>
		</select>
	</div>

	{#if !frameworks.activeIsPreset}
		<div class="field">
			<label for="format-name">Name</label>
			<input
				id="format-name"
				type="text"
				maxlength="40"
				value={active.name}
				oninput={(e) => frameworks.renameActive(e.currentTarget.value)}
			/>
		</div>
	{/if}

	{#if active.kind === 'ranked'}
		<div class="field">
			<label for="format-slots">Number of ranks</label>
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

	{#if frameworks.activeIsModifiedPreset}
		<p class="hint">
			You've changed this preset. <strong>Save format</strong> keeps it as your own, or
			<strong>Reset to default</strong> undoes the changes.
		</p>
	{/if}

	<div class="actions">
		<button
			class="btn"
			disabled={!frameworks.canSaveCustom}
			title={frameworks.canSaveCustom
				? 'Save this format as one of your formats'
				: `You can save up to ${MAX_CUSTOM_FRAMEWORKS} formats. Delete one to save another.`}
			onclick={openSave}
		>
			Save format
		</button>
		{#if frameworks.activeIsPreset}
			<button
				class="btn ghost"
				disabled={!frameworks.activeIsModifiedPreset}
				onclick={() => frameworks.resetPreset()}
			>
				Reset to default
			</button>
		{:else}
			<button
				class="btn ghost danger"
				onclick={() => confirmOrRun('delete', () => frameworks.deleteCustom(active.id))}
			>
				{confirming === 'delete' ? 'Click to confirm delete' : 'Delete format'}
			</button>
		{/if}
		<button
			class="btn ghost danger"
			onclick={() => confirmOrRun('clear', () => rankings.clear(active))}
		>
			{confirming === 'clear' ? 'Click to confirm clear' : 'Clear rankings'}
		</button>
	</div>
</aside>

<dialog bind:this={dialog} aria-labelledby="save-title">
	<form onsubmit={save}>
		<h2 id="save-title">Save format</h2>
		<p>
			Saves this format and its current rankings as one of your formats ({customCount}/{MAX_CUSTOM_FRAMEWORKS}
			used).
			{#if auth.user}
				It will sync to your account.
			{:else}
				It's stored in this browser. Sign in to sync it to your account.
			{/if}
		</p>
		<label>
			<span>Name</span>
			<input type="text" bind:value={newName} maxlength="40" required />
		</label>
		<div class="dialog-actions">
			<button type="button" class="btn ghost" onclick={() => dialog.close()}>Cancel</button>
			<button type="submit" class="btn">Save</button>
		</div>
	</form>
</dialog>

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

	.field {
		display: grid;
		gap: 4px;
	}

	.field label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted);
	}

	.field select,
	.field input {
		width: 100%;
		color: var(--text);
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

	dialog {
		width: min(420px, calc(100vw - 32px));
		padding: 20px;
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.6);
	}

	dialog p {
		color: var(--muted);
		font-size: 0.9rem;
	}

	dialog label {
		display: grid;
		gap: 4px;
		font-size: 0.85rem;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 16px;
	}
</style>
