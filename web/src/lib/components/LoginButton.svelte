<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { cloudSync, type SyncStatus } from '$lib/stores/cloudSync.svelte';

	let open = $state(false);
	let root: HTMLElement;

	const statusText: Record<SyncStatus, string> = {
		off: '',
		syncing: 'Syncing…',
		synced: 'Formats synced',
		error: 'Sync failed; changes are saved in this browser',
		'needs-attention': 'Choose which formats to keep'
	};

	const initials = $derived(
		(auth.user?.displayName ?? auth.user?.email ?? '?')
			.split(/[\s@.]+/)
			.slice(0, 2)
			.map((s) => s[0]?.toUpperCase() ?? '')
			.join('')
	);

	function onWindowClick(e: MouseEvent) {
		if (open && !root.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="login" bind:this={root}>
	{#if !auth.available}
		<button class="btn" disabled title="Login isn't configured for this build">Log in</button>
	{:else if !auth.ready}
		<button class="btn" disabled>Log in</button>
	{:else if !auth.user}
		<button class="btn" onclick={() => auth.signIn()}>Log in</button>
		{#if auth.error}<p class="error" role="alert">{auth.error}</p>{/if}
	{:else}
		<button
			class="avatar"
			aria-haspopup="menu"
			aria-expanded={open}
			aria-label="Account menu"
			onclick={() => (open = !open)}
		>
			{#if auth.user.photoURL}
				<img src={auth.user.photoURL} alt="" referrerpolicy="no-referrer" />
			{:else}
				{initials}
			{/if}
		</button>
		{#if open}
			<div class="menu" role="menu">
				<div class="who">
					<strong>{auth.user.displayName ?? 'Signed in'}</strong>
					{#if auth.user.email}<span>{auth.user.email}</span>{/if}
					{#if statusText[cloudSync.status]}<span class="status">{statusText[cloudSync.status]}</span>{/if}
				</div>
				<button
					class="btn ghost"
					role="menuitem"
					onclick={async () => {
						open = false;
						await cloudSync.signOut();
					}}>Log out</button
				>
			</div>
		{/if}
	{/if}
</div>

<style>
	.login {
		position: relative;
	}

	.avatar {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 2px solid var(--accent);
		background: var(--surface-2);
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		overflow: hidden;
		padding: 0;
		display: grid;
		place-items: center;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		z-index: 20;
		min-width: 220px;
		padding: 12px;
		display: grid;
		gap: 10px;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.5);
	}

	.who {
		display: grid;
		gap: 2px;
		font-size: 0.85rem;
	}

	.who span {
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	.who .status {
		margin-top: 4px;
		font-size: 0.78rem;
	}

	.error {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		width: max-content;
		max-width: 240px;
		margin: 0;
		font-size: 0.8rem;
		color: #ffb4b6;
	}
</style>
