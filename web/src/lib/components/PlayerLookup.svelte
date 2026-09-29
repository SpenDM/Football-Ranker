<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import { searchEntries, type PlayerEntry, type RankedPlayer } from '$lib/fantasy-roster/player-rankings';
	import { unavailable } from '$lib/stores/rosterMode.svelte';
	import AvailabilityButton from './AvailabilityButton.svelte';
	import GameBreakdownPanel from './GameBreakdownPanel.svelte';
	import ScoreRow from './ScoreRow.svelte';

	let {
		label,
		ranked
	}: {
		/** The slot, e.g. "RB". */
		label: string;
		/** Everyone in the slot (available or not), ranked by points per game. */
		ranked: RankedPlayer[];
	} = $props();

	let searching = $state(false);
	let query = $state('');
	let highlighted = $state(0);
	let selected = $state<string | null>(null);
	let root: HTMLElement;

	const matches = $derived(
		selected ? [] : searchEntries(query, ranked.map((r) => r.entry))
	);
	const row = $derived(ranked.find((r) => r.entry.id === selected));
	const listId = $derived(`player-lookup-${label.replace(/\W+/g, '-')}`);

	function dismiss() {
		searching = false;
		query = '';
		selected = null;
	}

	function choose(entry: PlayerEntry) {
		selected = entry.id;
		query = entry.name;
	}

	function onInput() {
		selected = null;
		highlighted = 0;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			highlighted = (highlighted + step + matches.length) % Math.max(matches.length, 1);
		} else if (e.key === 'Enter' && matches[highlighted]) {
			choose(matches[highlighted]);
		}
	}

	function focusInput(node: HTMLInputElement) {
		node.focus();
	}
</script>

<svelte:window
	onpointerdown={(e) => {
		if (searching && !root.contains(e.target as Node)) dismiss();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape' && searching) dismiss();
	}}
/>

<div class="lookup" class:active={searching} bind:this={root}>
	{#if searching}
		<div class="search">
			<input
				type="text"
				role="combobox"
				placeholder={label === 'D/ST' ? 'City or team name' : 'Player name'}
				aria-label="Player lookup, {label}"
				aria-autocomplete="list"
				aria-expanded={matches.length > 0}
				aria-controls={listId}
				aria-activedescendant={matches.length ? `${listId}-${highlighted}` : undefined}
				bind:value={query}
				oninput={onInput}
				onkeydown={onKeydown}
				{@attach focusInput}
			/>
			{#if matches.length}
				<ul class="matches" id={listId} role="listbox" aria-label="Matching players">
					{#each matches as entry, i (entry.id)}
						{@const team = teamsByAbbr.get(entry.team)}
						<!-- Keyboard selection happens in the input (arrow keys + Enter), per the combobox
						     pattern, so options don't take focus themselves. -->
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
						<li
							id="{listId}-{i}"
							role="option"
							aria-selected={i === highlighted}
							class:unavailable={unavailable.current.includes(entry.id)}
							onpointerenter={() => (highlighted = i)}
							onclick={() => choose(entry)}
						>
							{#if team}<img src={team.logo} alt="" />{/if}<span class="match-name"
								>{entry.name}</span
							><span class="pos">{entry.position === 'D/ST' ? '' : entry.position}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		{#if row}
			{@const out = unavailable.current.includes(row.entry.id)}
			<div class="result" role="group" aria-label="{row.entry.name} {label}">
				<div class="row-box">
					<ScoreRow
						rank={row.rank}
						teamAbbr={row.entry.team}
						name={row.entry.name}
						detail={row.detail}
						score={row.scoreText}
						title="#{row.rank} {row.entry.name}: {row.scoreText} points per game"
					/>
					<AvailabilityButton entry={row.entry} />
				</div>
				<p class="status" class:out>
					{out ? 'Not available: hidden from Best Available.' : 'Available.'}
				</p>
				<GameBreakdownPanel
					games={row.entry.breakdown}
					label="{row.entry.name} by game"
					opponentRankLabel={row.entry.opponentRankLabel}
				/>
			</div>
		{/if}
	{:else}
		<button class="btn ghost open" onclick={() => (searching = true)}>Player Lookup</button>
	{/if}
</div>

<style>
	.open,
	input {
		min-height: 28px;
		font-size: 0.8rem;
	}

	.open {
		padding: 0.2rem 0.6rem;
	}

	.search {
		position: relative;
	}

	input {
		width: 200px;
		padding: 0.2rem 0.5rem;
		border: 1px solid var(--accent-strong);
		border-radius: 8px;
		background: var(--bg-deep);
		color: var(--text);
	}

	.matches {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: 2;
		width: 260px;
		margin: 0;
		padding: 4px;
		list-style: none;
		background: var(--surface-2);
		border: 1px solid var(--accent-strong);
		border-radius: 8px;
		box-shadow: 0 10px 24px rgb(0 0 0 / 0.5);
	}

	.matches li {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 8px;
		border-radius: 6px;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.matches li[aria-selected='true'] {
		background: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.matches li.unavailable .match-name {
		color: var(--muted);
		text-decoration: line-through;
	}

	.match-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pos {
		font-size: 0.75rem;
		color: var(--muted);
	}

	.matches img {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	/* Drops down under the slot bar, right-aligned with the lookup. */
	.result {
		container-type: inline-size;
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: 1;
		display: grid;
		gap: 4px;
		width: min(440px, 100%);
		background: var(--bg);
		border-radius: 8px;
	}

	.row-box {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 4px;
		padding: 6px;
		background: var(--bg-deep);
		border: 1px solid var(--accent-strong);
		border-radius: 8px;
		box-shadow: 0 10px 24px rgb(0 0 0 / 0.5);
	}

	.status {
		margin: 0;
		padding: 2px 6px;
		font-size: 0.78rem;
		color: #30a46c;
	}

	.status.out {
		color: var(--muted);
	}
</style>
