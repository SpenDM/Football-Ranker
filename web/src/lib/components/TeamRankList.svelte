<script lang="ts">
	import type { GameBreakdown, RankedTeam } from '$lib/fantasy-roster/team-rankings';
	import type { TeamFantasyStats } from '$lib/data/fantasy';
	import { teamsByAbbr } from '$lib/data/teams';
	import GameBreakdownPanel from './GameBreakdownPanel.svelte';
	import TeamScoreRow from './TeamScoreRow.svelte';

	let {
		label,
		heading,
		entries,
		detail,
		breakdown,
		opponentRankLabel
	}: {
		/** Accessible name, e.g. "Top 10 offense rushing". */
		label: string;
		heading: string;
		entries: RankedTeam[];
		detail: (team: TeamFantasyStats) => string;
		/** A team's game-by-game scores in this category, shown when its row is clicked. */
		breakdown: (team: TeamFantasyStats) => GameBreakdown[];
		/** What the opponent's rank is in, e.g. "rushing defense rank" (shown on hover). */
		opponentRankLabel: string;
	} = $props();

	/** The team whose game breakdown is open. */
	let open = $state<string | null>(null);
	let listEl: HTMLElement;

	// Clicking anywhere outside the open row and its breakdown closes it.
	function onPointerDown(e: PointerEvent) {
		const openItem = listEl.querySelector('.item.open');
		if (openItem && !openItem.contains(e.target as Node)) open = null;
	}
</script>

<svelte:window
	onpointerdown={onPointerDown}
	onkeydown={(e) => {
		if (e.key === 'Escape') open = null;
	}}
/>

<div class="list" class:has-open={open} aria-label={label} role="region" bind:this={listEl}>
	<h4>{heading}</h4>
	<ol>
		{#each entries as entry (entry.abbr)}
			<li class="item" class:open={open === entry.abbr}>
				<TeamScoreRow
					{entry}
					{detail}
					expanded={open === entry.abbr}
					onclick={() => (open = open === entry.abbr ? null : entry.abbr)}
				/>
				{#if open === entry.abbr}
					<div class="popup">
						<GameBreakdownPanel
							games={breakdown(entry.team)}
							label="{teamsByAbbr.get(entry.abbr)?.nickname ?? entry.abbr} by game"
							{opponentRankLabel}
						/>
					</div>
				{/if}
			</li>
		{/each}
	</ol>
</div>

<style>
	.list {
		container-type: inline-size;
		padding: 10px;
		background: var(--bg-deep);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: var(--radius);
	}

	h4 {
		margin: 0 0 6px;
		padding: 0 4px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent-strong);
	}

	ol {
		display: grid;
		gap: 3px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Above the lists that follow it, so an open breakdown isn't covered. */
	.list.has-open {
		position: relative;
		z-index: 5;
	}

	.item {
		position: relative;
	}

	.popup {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 1;
	}
</style>
