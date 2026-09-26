<script lang="ts">
	import { tools, type Tool } from '$lib/tools';
	import LoginButton from './LoginButton.svelte';

	let { tool }: { tool: Tool } = $props();
	const others = $derived(tools.filter((t) => t.slug !== tool.slug));
</script>

<header class="banner">
	<h1>{tool.name}</h1>
	<nav aria-label="Tools">
		<a class="btn ghost" href="/">
			<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"
				><path fill="currentColor" d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3z" /></svg
			>
			Home
		</a>
		{#each others as t (t.slug)}
			<a class="btn ghost" href={t.path}>{t.name}</a>
		{/each}
	</nav>
	<LoginButton />
</header>

<style>
	.banner {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 16px;
		min-height: var(--banner-height);
		padding: 10px 20px;
		background: var(--bg-deep);
		border-bottom: 2px solid var(--accent);
	}

	h1 {
		font-size: 1.3rem;
		margin-right: auto;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	@media (max-width: 720px) {
		.banner {
			flex-wrap: wrap;
			padding: 10px 16px;
		}
		nav {
			order: 3;
			width: 100%;
		}
		nav .btn {
			flex: 1 1 auto;
		}
	}
</style>
