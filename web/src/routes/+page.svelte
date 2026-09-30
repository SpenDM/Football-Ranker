<script lang="ts">
	import LoginButton from '$lib/components/LoginButton.svelte';
	import ToolCard from '$lib/components/ToolCard.svelte';
	import { tools } from '$lib/tools';
</script>

<svelte:head>
	<title>Football Tools</title>
	<meta name="description" content="Power rankings, fantasy roster, league and draft tools for football fans." />
</svelte:head>

<div class="top"><LoginButton /></div>

<section class="hero">
	<h1>Football Tools</h1>
	<p>Rank the league, run your fantasy roster and leagues, and build your draft board.</p>
</section>

<div class="tools">
	{#each tools as tool (tool.slug)}
		<ToolCard {tool} />
	{/each}
</div>

<style>
	.top {
		display: flex;
		justify-content: flex-end;
	}

	.hero {
		text-align: center;
		margin: 48px auto 40px;
	}

	.hero h1 {
		font-size: clamp(2.2rem, 6vw, 3.4rem);
		letter-spacing: -0.02em;
	}

	.hero p {
		margin-top: 10px;
		color: var(--muted);
		font-size: 1.1rem;
	}

	.tools {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 20px;
		max-width: 1080px;
		margin: 0 auto;
	}
</style>
