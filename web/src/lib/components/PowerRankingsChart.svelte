<script lang="ts">
	import { fantasyTeams } from '$lib/data/fantasy';
	import { teamsByAbbr } from '$lib/data/teams';
	import { REGULAR_SEASON_WEEKS, weeklyPowerRankings } from '$lib/fantasy-roster/team-power';

	const { throughWeek, weekComplete, teams, draftOrder } = fantasyTeams;
	const lastCompleteWeek = weekComplete ? throughWeek : throughWeek - 1;
	// The data is fixed at build time, so the rankings only need computing once.
	const weeks = weeklyPowerRankings(teams, draftOrder, lastCompleteWeek);
	/** The latest week with rankings; only its logos are in the tab order. */
	const currentWeek = Math.min(lastCompleteWeek + 1, REGULAR_SEASON_WEEKS);

	const TEAM_COUNT = 32;
	/** A small gap after every this many teams. */
	const GROUP = 8;
	const GROUP_GAP = 6;
	const HEADER_HEIGHT = 22;
	/** Where the first logo starts, just below the week titles. */
	const TOP = HEADER_HEIGHT + 9;
	/** Room under the last logo for the selected team's rank. */
	const BOTTOM = 14;
	/** Space kept below the chart when fitting it on screen. */
	const MARGIN = 12;
	const MIN_PITCH = 56;
	/** Horizontal room kept between columns for the selected team's line and results. */
	const LANE = 28;
	const MIN_CELL = 16;

	let width = $state(0);
	let viewportHeight = $state(900);
	/** Where the chart starts on the page. */
	let chartTop = $state(0);
	let chartEl = $state<HTMLElement>();

	function measure() {
		if (!chartEl) return;
		chartTop = chartEl.getBoundingClientRect().top + window.scrollY;
	}
	$effect(measure);

	/** Column spacing: the full width, or scrolling sideways when that's too narrow. */
	const pitch = $derived(Math.max(MIN_PITCH, width / REGULAR_SEASON_WEEKS));
	/**
	 * Logo size: as large as lets a whole column fit on screen. That's from where the chart
	 * starts when it's on the first screen, otherwise from the top of the window once scrolled
	 * to. It's also kept narrow enough to leave room between columns.
	 */
	const cell = $derived.by(() => {
		const start = chartTop + 200 < viewportHeight ? chartTop : 0;
		const room = viewportHeight - start - MARGIN - TOP - BOTTOM - 3 * GROUP_GAP;
		const fit = Math.floor(room / TEAM_COUNT);
		return Math.max(MIN_CELL, Math.min(fit, Math.floor(pitch) - LANE));
	});

	/** Left edge of a week's logos, by column index, on whole pixels so they stack seamlessly. */
	const left = (i: number) => Math.round(i * pitch + (pitch - cell) / 2);
	/** Top edge of a rank's logo. */
	const top = (rank: number) =>
		TOP + (rank - 1) * cell + Math.floor((rank - 1) / GROUP) * GROUP_GAP;
	/** Center of a logo. */
	const x = (i: number) => left(i) + cell / 2;
	const y = (rank: number) => top(rank) + cell / 2;
	const height = $derived(y(TEAM_COUNT) + cell / 2 + BOTTOM);

	let selectedTeam = $state<string | null>(null);
	let selectedWeek = $state<number | null>(null);

	/** The selected team's entry in each week that has rankings, by column index. */
	const path = $derived(
		selectedTeam
			? weeks.flatMap((w, i) => {
					const entry = w.entries?.find((e) => e.abbr === selectedTeam);
					return entry ? [{ i, entry }] : [];
				})
			: []
	);
	const selectedColor = $derived(
		selectedTeam ? teamsByAbbr.get(selectedTeam)?.primaryColor : undefined
	);

	const fmt = (n: number) => (Math.abs(n) < 0.05 ? '0.0' : n.toFixed(1).replace('-', '−'));
	const signed = (n: number) => (n >= 0.05 ? `+${fmt(n)}` : fmt(n));

	function selectTeam(abbr: string) {
		selectedTeam = selectedTeam === abbr ? null : abbr;
		selectedWeek = null;
	}

	function selectWeek(week: number) {
		selectedWeek = selectedWeek === week ? null : week;
		selectedTeam = null;
	}

	// Clicking anything other than a logo or week title returns to the normal view.
	function onPointerDown(e: PointerEvent) {
		if (!(e.target as Element).closest?.('.chart button')) {
			selectedTeam = null;
			selectedWeek = null;
		}
	}
</script>

<svelte:window
	bind:innerHeight={viewportHeight}
	onresize={measure}
	onpointerdown={onPointerDown}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			selectedTeam = null;
			selectedWeek = null;
		}
	}}
/>

<div class="scroller" bind:clientWidth={width}>
	<div
		class="chart"
		bind:this={chartEl}
		role="group"
		aria-label="Power rankings by week"
		style:width="{pitch * REGULAR_SEASON_WEEKS}px"
		style:height="{height}px"
		style:--cell="{cell}px"
	>
		{#each weeks as w, i (w.week)}
			<button
				class="week-head"
				style:left="{i * pitch}px"
				style:width="{pitch}px"
				style:height="{HEADER_HEIGHT}px"
				disabled={!w.entries}
				aria-pressed={selectedWeek === w.week}
				title={w.entries ? `Week ${w.week}: click for each team's power score` : `Week ${w.week}`}
				onclick={() => selectWeek(w.week)}>Wk {w.week}</button
			>
			{#each w.entries ?? [] as e (e.abbr)}
				{@const team = teamsByAbbr.get(e.abbr)}
				{@const picked = selectedTeam === e.abbr}
				<button
					class="tile"
					class:picked
					class:dim={(selectedTeam && !picked) || (selectedWeek !== null && selectedWeek !== w.week)}
					style:left="{left(i)}px"
					style:top="{top(e.rank)}px"
					style:--primary={team?.primaryColor}
					style:--secondary={team?.secondaryColor}
					tabindex={w.week === currentWeek ? 0 : -1}
					aria-pressed={picked}
					aria-label="Week {w.week}: #{e.rank} {team?.name ?? e.abbr}"
					title={`Week ${w.week}: #${e.rank} ${team?.name ?? e.abbr}, power score ${fmt(e.score)}\n` +
						`#${e.pointsRank} by ranking points (${fmt(e.points)})` +
						(e.offenseRank !== null && e.defenseRank !== null
							? `, #${e.offenseRank} offense, #${e.defenseRank} defense`
							: '')}
					onclick={() => selectTeam(e.abbr)}
					>{#if team}<img src={team.logo} alt="" class:on-color={team.logoOnColor} />{/if}</button
				>
				{#if selectedWeek === w.week}
					<span class="label points" style:left="{x(i) + cell / 2 + 2}px" style:top="{y(e.rank)}px"
						>{fmt(e.score)}</span
					>
				{/if}
			{/each}
		{/each}

		{#if path.length}
			<svg class="line" width={pitch * REGULAR_SEASON_WEEKS} {height} aria-hidden="true">
				<polyline class="halo" points={path.map((p) => `${x(p.i)},${y(p.entry.rank)}`).join(' ')} />
				<polyline
					style:stroke={selectedColor}
					points={path.map((p) => `${x(p.i)},${y(p.entry.rank)}`).join(' ')}
				/>
			</svg>
			{#each path as p, k (p.i)}
				{@const next = path[k + 1]}
				<span class="label rank" style:left="{x(p.i)}px" style:top="{y(p.entry.rank) + cell / 2 + 1}px"
					>#{p.entry.rank}</span
				>
				{#if next}
					{@const game = p.entry.game}
					{@const opp = game ? teamsByAbbr.get(game.opponent) : undefined}
					<span
						class="label result"
						style:left="{(x(p.i) + x(next.i)) / 2}px"
						style:top="{(y(p.entry.rank) + y(next.entry.rank)) / 2 - 3}px"
						title={game
							? `Week ${weeks[p.i].week}: ${game.outcome} ${game.pointsFor}–${game.pointsAgainst} ${game.home ? 'vs' : '@'} #${game.opponentRank} ${opp?.name ?? game.opponent}`
							: `Week ${weeks[p.i].week}: bye`}
					>
						{#if game}
							<span
								class="outcome"
								class:win={game.outcome === 'W'}
								class:loss={game.outcome === 'L'}>{game.outcome}</span
							>{#if opp}<img src={opp.logo} alt="" />{/if}<span class="change"
								>{signed(game.change)}</span
							>
						{:else}
							<span class="bye">BYE</span>
						{/if}
					</span>
				{/if}
			{/each}
		{/if}
	</div>
</div>

<style>
	.scroller {
		overflow-x: auto;
		overflow-y: hidden;
	}

	.chart {
		position: relative;
	}

	.week-head {
		position: absolute;
		top: 0;
		padding: 0;
		border: 0;
		border-radius: 6px;
		background: none;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--accent-strong);
		cursor: pointer;
	}

	.week-head:hover:not(:disabled),
	.week-head[aria-pressed='true'] {
		background: var(--surface-2);
		color: var(--text);
	}

	.week-head:disabled {
		color: color-mix(in srgb, var(--muted) 50%, transparent);
		cursor: default;
	}

	/* Logos like the other tables', stacked edge to edge. */
	.tile {
		position: absolute;
		z-index: 1;
		display: grid;
		place-items: center;
		width: var(--cell);
		height: var(--cell);
		padding: 0;
		border: 1px solid var(--secondary);
		border-radius: 3px;
		background: var(--primary);
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.tile img {
		width: 78%;
		height: 78%;
		object-fit: contain;
		filter: drop-shadow(0 0 1px rgb(255 255 255 / 0.9));
		pointer-events: none;
	}

	.tile img.on-color {
		filter: none;
	}

	.tile.dim {
		opacity: 0.18;
	}

	/* The selected team sits above its line; everything else below it. */
	.tile.picked {
		z-index: 3;
		box-shadow: 0 0 0 1px var(--text);
	}

	.line {
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		overflow: visible;
	}

	.line polyline {
		fill: none;
		stroke-width: 3;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	/* A light edge so dark team colors still show on the dark background. */
	.line .halo {
		stroke: var(--accent-strong);
		stroke-width: 5.5;
		opacity: 0.8;
	}

	.label {
		position: absolute;
		z-index: 4;
		padding: 0 3px;
		border-radius: 4px;
		background: var(--bg-deep);
		font-size: 0.62rem;
		font-weight: 700;
		line-height: 1.35;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}

	.rank {
		transform: translateX(-50%);
	}

	.points {
		transform: translateY(-50%);
	}

	/* W/L, opponent and ranking points stacked, sitting just above the line. */
	.result {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 2px 3px;
		line-height: 1.1;
		transform: translate(-50%, -100%);
		border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
		background: var(--surface-2);
	}

	.result img {
		width: 16px;
		height: 16px;
		object-fit: contain;
	}

	.outcome.win {
		color: #30a46c;
	}

	.outcome.loss {
		color: var(--danger);
	}

	.bye {
		color: var(--muted);
		letter-spacing: 0.04em;
	}
</style>
