<script lang="ts">
	import { page } from '$app/state';
	import LeagueList from '$lib/components/leagues/LeagueList.svelte';
	import LeagueView from '$lib/components/leagues/LeagueView.svelte';
	import { leagues } from '$lib/stores/leagues.svelte';

	// Leagues live in the browser (and Firestore), so the open one is a query parameter rather
	// than a prerendered route.
	const id = $derived(page.url.searchParams.get('league'));
	const league = $derived(leagues.byId(id));
</script>

<svelte:head><title>{league ? `${league.name} · ` : ''}Leagues · Football Tools</title></svelte:head>

{#if league}
	{#key league.id}<LeagueView {league} />{/key}
{:else}
	<LeagueList missing={id !== null} />
{/if}
