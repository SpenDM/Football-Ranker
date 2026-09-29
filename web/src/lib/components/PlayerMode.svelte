<script lang="ts">
	import { asset } from '$app/paths';
	import { fantasyTeams, PLAYERS_PATH, type FantasyPlayerData } from '$lib/data/fantasy';
	import {
		bestMatchups,
		renumber,
		slotEntries,
		SLOTS,
		topPerformers
	} from '$lib/fantasy-roster/player-rankings';
	import { rankIndex } from '$lib/fantasy-roster/team-rankings';
	import { rosterSlot, unavailable } from '$lib/stores/rosterMode.svelte';
	import AvailabilityButton from './AvailabilityButton.svelte';
	import PlayerLookup from './PlayerLookup.svelte';
	import PlayerRankList from './PlayerRankList.svelte';

	/** Rows shown in each column. */
	const LIST_LENGTH = 20;

	const ranks = rankIndex(fantasyTeams.teams);

	async function loadPlayers(): Promise<FantasyPlayerData> {
		const res = await fetch(asset(PLAYERS_PATH));
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	}
	let data = $state<FantasyPlayerData | null>(null);
	let failed = $state(false);
	loadPlayers().then(
		(d) => (data = d),
		() => (failed = true)
	);

	const slot = $derived(SLOTS.find((s) => s.id === rosterSlot.current) ?? SLOTS[0]);
	const entries = $derived(data ? slotEntries(slot, data.players, fantasyTeams.teams, ranks) : []);
	const performers = $derived(topPerformers(entries, slot.id === 'FLEX'));
	const matchups = $derived(bestMatchups(entries, slot.id === 'DST'));
	const available = $derived(
		renumber(matchups.filter((r) => !unavailable.current.includes(r.entry.id)))
	);
</script>

<section class="players" aria-label="Player mode">
	<div class="slot-bar">
		<div class="slots" role="group" aria-label="Position">
			{#each SLOTS as s (s.id)}
				<button
					class="btn ghost"
					aria-pressed={slot.id === s.id}
					onclick={() => (rosterSlot.current = s.id)}>{s.label}</button
				>
			{/each}
		</div>
		{#if data}
			{#key slot.id}
				<PlayerLookup label={slot.label} ranked={performers} />
			{/key}
		{/if}
	</div>

	<p class="formula">{slot.formula}</p>

	{#if data}
		<div class="columns">
			<PlayerRankList
				label="Top Performers {slot.label}"
				heading="Top Performers"
				rows={performers.slice(0, LIST_LENGTH)}
			/>
			<PlayerRankList
				label="Best Matchup {slot.label}"
				heading="Best Matchup"
				rows={matchups.slice(0, LIST_LENGTH)}
				empty="No upcoming games."
			/>
			<PlayerRankList
				label="Best Available {slot.label}"
				heading="Best Available"
				rows={available.slice(0, LIST_LENGTH)}
				empty="Nobody left. Use Player Lookup to mark players available again."
			>
				{#snippet action(entry)}<AvailabilityButton {entry} />{/snippet}
			</PlayerRankList>
		</div>
	{:else if failed}
		<p class="status">Couldn't load player data. Try reloading the page.</p>
	{:else}
		<p class="status">Loading players…</p>
	{/if}
</section>

<style>
	.players {
		display: grid;
		gap: 10px;
	}

	/* Position buttons on the left, Player Lookup on the right; lookup results drop down from
	   here across the columns. */
	.slot-bar {
		position: relative;
		z-index: 6;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.slots {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.slots .btn {
		min-width: 3.4rem;
		padding: 0.3rem 0.7rem;
		font-weight: 700;
	}

	.slots .btn[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg-deep);
	}

	.formula,
	.status {
		margin: 0;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}

	@container (min-width: 620px) {
		.columns {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@container (min-width: 960px) {
		.columns {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
