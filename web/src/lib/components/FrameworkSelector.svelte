<script lang="ts">
	import { MAX_CUSTOM_FRAMEWORKS } from '$lib/power-rankings/frameworks';
	import { auth } from '$lib/stores/auth.svelte';
	import { frameworks } from '$lib/stores/frameworks.svelte';
	import { rankings } from '$lib/stores/rankings.svelte';

	let { editing = $bindable() }: { editing: boolean } = $props();

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

<div class="toolbar">
	<label class="picker">
		<span>Framework</span>
		<select
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
			<optgroup label="My frameworks ({customCount}/{MAX_CUSTOM_FRAMEWORKS})">
				{#each frameworks.customs.current as fw (fw.id)}
					<option value={fw.id}>{fw.name}</option>
				{:else}
					<option disabled>None saved yet</option>
				{/each}
			</optgroup>
		</select>
	</label>

	<div class="actions">
		<button class="btn" aria-pressed={editing} onclick={() => (editing = !editing)}>
			{editing ? 'Done editing' : 'Edit format'}
		</button>
		<button
			class="btn"
			disabled={!frameworks.canSaveCustom}
			title={frameworks.canSaveCustom
				? 'Save this format as one of your frameworks'
				: `You can save up to ${MAX_CUSTOM_FRAMEWORKS} frameworks. Delete one to save another.`}
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
				{confirming === 'delete' ? 'Click to confirm delete' : 'Delete framework'}
			</button>
		{/if}
		<button
			class="btn ghost danger"
			onclick={() => confirmOrRun('clear', () => rankings.clear(active))}
		>
			{confirming === 'clear' ? 'Click to confirm clear' : 'Clear rankings'}
		</button>
	</div>
</div>

<dialog bind:this={dialog} aria-labelledby="save-title">
	<form onsubmit={save}>
		<h2 id="save-title">Save format</h2>
		<p>
			Saves this format and its current rankings as a new framework ({customCount}/{MAX_CUSTOM_FRAMEWORKS}
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
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 12px;
	}

	.picker {
		display: grid;
		gap: 4px;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.picker select {
		min-width: 240px;
		font-size: 1rem;
		color: var(--text);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
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
