<script lang="ts">
	import type { Tool } from '$lib/tools';

	let { tool }: { tool: Tool } = $props();
</script>

<a class="tool" href={tool.path}>
	<span class="top">
		<span class="name">{tool.name}</span>
		{#if tool.status === 'coming-soon'}<span class="badge">Coming soon</span>{/if}
	</span>
	<span class="desc">{tool.description}</span>
	<span class="go" aria-hidden="true">Open →</span>
</a>

<style>
	.tool {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 22px;
		min-height: 180px;
		border: 1px solid var(--accent);
		border-radius: 14px;
		background: linear-gradient(160deg, var(--surface-2), var(--surface));
		color: var(--text);
		text-decoration: none;
		transition:
			transform 0.15s,
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.tool:hover {
		transform: translateY(-3px);
		border-color: var(--accent-strong);
		box-shadow: 0 10px 28px rgb(0 0 0 / 0.4);
	}

	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.name {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.badge {
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--bg-deep);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.desc {
		color: var(--muted);
	}

	.go {
		margin-top: auto;
		font-weight: 600;
		color: var(--accent-strong);
	}
</style>
