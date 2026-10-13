<script lang="ts">
	import type { ShareSlice } from '$lib/fantasy-roster/ball-share';
	import type { PlayerEntry, RankedPlayer } from '$lib/fantasy-roster/player-rankings';
	import type { Snippet } from 'svelte';
	import BallSharePanel from './BallSharePanel.svelte';
	import GameBreakdownPanel from './GameBreakdownPanel.svelte';
	import ScoreRow from './ScoreRow.svelte';

	let {
		label,
		heading,
		rows,
		empty = 'No players.',
		action,
		ballShare,
		shareSide = 'right'
	}: {
		/** Accessible name, e.g. "Top Performers RB". */
		label: string;
		heading: string;
		rows: RankedPlayer[];
		/** Shown when there are no rows. */
		empty?: string;
		/** A button beside each row (e.g. mark not available). */
		action?: Snippet<[PlayerEntry]>;
		/** The player's team's Ball Share slices, or null for no Ball Share box. */
		ballShare?: (entry: PlayerEntry) => ShareSlice[] | null;
		/** Which side of the game breakdown the Ball Share box opens on, on wide layouts. */
		shareSide?: 'left' | 'right';
	} = $props();

	/** The player whose game breakdown is open. */
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
	{#if rows.length}
		<ol>
			{#each rows as row (row.entry.id)}
				<li class="item" class:open={open === row.entry.id} class:with-action={action}>
					<ScoreRow
						rank={row.rank}
						teamAbbr={row.entry.team}
						name={row.entry.name}
						detail={row.detail}
						score={row.scoreText}
						title="#{row.rank} {row.entry.name} ({row.entry.position}, {row.entry.team}): {row.scoreText} · {row.detail}"
						expanded={open === row.entry.id}
						onclick={() => (open = open === row.entry.id ? null : row.entry.id)}
					/>
					{#if action}{@render action(row.entry)}{/if}
					{#if open === row.entry.id}
						{@const slices = ballShare?.(row.entry)}
						<div class="popup">
							<GameBreakdownPanel
								games={row.entry.breakdown}
								label="{row.entry.name} by game"
								opponentRankLabel={row.entry.opponentRankLabel}
							/>
							{#if slices}
								<div class="beside {shareSide}">
									<BallSharePanel {slices} teamAbbr={row.entry.team} playerName={row.entry.name} />
								</div>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<p class="empty">{empty}</p>
	{/if}
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

	/* Above the lists beside and below it, so an open breakdown isn't covered. */
	.list.has-open {
		position: relative;
		z-index: 5;
	}

	.item {
		position: relative;
	}

	.item.with-action {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 4px;
	}

	.popup {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 1;
	}

	/* Ball Share stacks under the breakdown, or sits beside it once the three columns leave
	   room (it then covers part of the neighboring column). */
	.beside {
		margin-top: 6px;
	}

	@container roster (min-width: 960px) {
		.beside {
			position: absolute;
			top: 0;
			width: 320px;
			margin: 0;
		}
		.beside.right {
			left: calc(100% + 8px);
		}
		.beside.left {
			right: calc(100% + 8px);
		}
	}

	.empty {
		margin: 0;
		padding: 4px;
		font-size: 0.85rem;
		color: var(--muted);
	}
</style>
