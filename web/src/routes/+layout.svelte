<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import OverflowDialog from '$lib/components/OverflowDialog.svelte';
	import TopBanner from '$lib/components/TopBanner.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { cloudSync } from '$lib/stores/cloudSync.svelte';
	import { toolForPath } from '$lib/tools';
	import { onMount } from 'svelte';

	let { children } = $props();

	const tool = $derived(toolForPath(page.url.pathname));

	onMount(() => {
		cloudSync.start();
		void auth.init();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if tool}<TopBanner {tool} />{/if}
<main>{@render children()}</main>
<OverflowDialog />

<style>
	main {
		padding: 20px;
		max-width: 1760px;
		margin: 0 auto;
	}

	@media (max-width: 560px) {
		main {
			padding: 16px;
		}
	}
</style>
