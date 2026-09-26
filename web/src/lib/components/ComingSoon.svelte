<script lang="ts">
	import type { Tool } from '$lib/tools';

	let { tool, features }: { tool: Tool; features: string[] } = $props();
</script>

<svelte:head><title>{tool.name} · Football Tools</title></svelte:head>

<section class="soon">
	<span class="badge">Coming soon</span>
	<h2>{tool.name}</h2>
	<p>{tool.description}</p>
	<h3>Planned features</h3>
	<ul>
		{#each features as f (f)}<li>{f}</li>{/each}
	</ul>
</section>

<style>
	.soon {
		max-width: 680px;
		margin: 48px auto;
		padding: 28px;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: 14px;
	}

	.badge {
		display: inline-block;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--bg-deep);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	h2 {
		margin-top: 12px;
		font-size: 1.6rem;
	}

	p,
	li {
		color: var(--muted);
	}

	h3 {
		margin-top: 20px;
		font-size: 1rem;
	}
</style>
