<script lang="ts">
	import type { TeamFantasyStats } from '$lib/data/fantasy';
	import type { Team } from '$lib/data/teams';
	import { searchTeams } from '$lib/fantasy-roster/team-lookup';
	import type { GameBreakdown, RankedTeam } from '$lib/fantasy-roster/team-rankings';
	import GameBreakdownPanel from './GameBreakdownPanel.svelte';
	import TeamScoreRow from './TeamScoreRow.svelte';

	let {
		label,
		ranked,
		detail,
		breakdown,
		opponentRankLabel
	}: {
		/** The category, e.g. "offense rushing". */
		label: string;
		/** Every team in this category, best first. */
		ranked: RankedTeam[];
		detail: (team: TeamFantasyStats) => string;
		breakdown: (team: TeamFantasyStats) => GameBreakdown[];
		opponentRankLabel: string;
	} = $props();

	let searching = $state(false);
	let query = $state('');
	let highlighted = $state(0);
	let selected = $state<string | null>(null);
	let root: HTMLElement;

	const matches = $derived(selected ? [] : searchTeams(query));
	const entry = $derived(ranked.find((r) => r.abbr === selected));
	const listId = $derived(`lookup-${label.replace(/\W+/g, '-')}`);

	function dismiss() {
		searching = false;
		query = '';
		selected = null;
	}

	function choose(team: Team) {
		selected = team.abbr;
		query = team.name;
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
				placeholder="City or team name"
				aria-label="Team lookup, {label}"
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
				<ul class="matches" id={listId} role="listbox" aria-label="Matching teams">
					{#each matches as team, i (team.abbr)}
						<!-- Keyboard selection happens in the input (arrow keys + Enter), per the combobox
						     pattern, so options don't take focus themselves. -->
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
						<li
							id="{listId}-{i}"
							role="option"
							aria-selected={i === highlighted}
							onpointerenter={() => (highlighted = i)}
							onclick={() => choose(team)}
						>
							<img src={team.logo} alt="" />{team.name}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		{#if entry}
			<div class="result" role="group" aria-label="{entry.team.abbr} {label}">
				<div class="row-box"><TeamScoreRow {entry} {detail} /></div>
				<GameBreakdownPanel
					games={breakdown(entry.team)}
					label="{query} by game"
					{opponentRankLabel}
				/>
			</div>
		{/if}
	{:else}
		<button class="btn ghost open" onclick={() => (searching = true)}>Team Lookup</button>
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
		width: 180px;
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
		width: 220px;
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

	.matches img {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	/* Spans the whole category, just under its title (the category head is the positioned box). */
	.result {
		container-type: inline-size;
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 1;
		display: grid;
		gap: 4px;
		/* Page background behind the gap between the two boxes, so the list below doesn't show. */
		background: var(--bg);
		border-radius: 8px;
	}

	.row-box {
		padding: 6px;
		background: var(--bg-deep);
		border: 1px solid var(--accent-strong);
		border-radius: 8px;
		box-shadow: 0 10px 24px rgb(0 0 0 / 0.5);
	}
</style>
