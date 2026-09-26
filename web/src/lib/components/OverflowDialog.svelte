<script lang="ts">
	import { MAX_CUSTOM_FRAMEWORKS } from '$lib/power-rankings/frameworks';
	import { cloudSync } from '$lib/stores/cloudSync.svelte';

	let dialog: HTMLDialogElement;
	let keep = $state<string[]>([]);

	$effect(() => {
		if (cloudSync.overflow && !dialog.open) {
			keep = cloudSync.overflow.slice(0, MAX_CUSTOM_FRAMEWORKS).map((f) => f.id);
			dialog.showModal();
		} else if (!cloudSync.overflow && dialog.open) {
			dialog.close();
		}
	});
</script>

<dialog bind:this={dialog} aria-labelledby="overflow-title" oncancel={(e) => e.preventDefault()}>
	<h2 id="overflow-title">Choose formats to keep</h2>
	<p>
		Together, your account and this browser have more than {MAX_CUSTOM_FRAMEWORKS} saved formats.
		Choose up to {MAX_CUSTOM_FRAMEWORKS} to keep. The rest will be deleted.
	</p>
	<ul>
		{#each cloudSync.overflow ?? [] as fw (fw.id)}
			<li>
				<label>
					<input
						type="checkbox"
						value={fw.id}
						bind:group={keep}
						disabled={!keep.includes(fw.id) && keep.length >= MAX_CUSTOM_FRAMEWORKS}
					/>
					{fw.name}
					<span>{fw.kind === 'ranked' ? `${fw.slots} ranks` : `${fw.tiers.length} tiers`}</span>
				</label>
			</li>
		{/each}
	</ul>
	<div class="actions">
		<button class="btn" onclick={() => cloudSync.resolveOverflow(keep)}>
			Keep {keep.length} selected
		</button>
	</div>
</dialog>

<style>
	dialog {
		width: min(460px, calc(100vw - 32px));
		padding: 20px;
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.6);
	}

	p,
	li span {
		color: var(--muted);
		font-size: 0.9rem;
	}

	ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 8px;
	}

	label {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
