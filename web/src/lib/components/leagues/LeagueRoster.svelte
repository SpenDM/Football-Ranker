<script lang="ts">
	import {
		gameLabel,
		isLocked,
		lineupFor,
		LINEUP,
		moveProblem,
		movePlayer,
		pointsIn,
		POSITION_LABELS,
		teamPoints,
		type League,
		type LeagueTeam,
		type Pool,
		type Schedule,
		type Spot
	} from '$lib/leagues/fantasy';
	import { leagues } from '$lib/stores/leagues.svelte';
	import PlayerName from './PlayerName.svelte';

	let {
		league,
		team,
		pool,
		schedule,
		readOnly
	}: {
		league: League;
		team: LeagueTeam;
		pool: Pool;
		schedule: Schedule;
		readOnly: boolean;
	} = $props();

	const latest = $derived(schedule.currentWeek ?? schedule.throughWeek);
	const firstWeek = $derived(Math.max(1, Math.min(league.settings.startWeek, latest)));
	/** The week picked in the menu; null shows the latest week. */
	let picked = $state<number | null>(null);
	const week = $derived(picked ?? latest);

	/** Only the current week's lineup can change; earlier weeks are a record. */
	const editing = $derived(!readOnly && week === schedule.currentWeek);
	const ctx = $derived({ pool, schedule, week });
	const lineup = $derived(lineupFor(team, week));
	const scored = $derived(week <= schedule.throughWeek);

	/** The player being moved (their Move button was clicked). */
	let moving = $state<string | null>(null);
	let message = $state<string | null>(null);

	const movingFrom = $derived(
		moving === null ? null : lineup.starters.includes(moving) ? lineup.starters.indexOf(moving) : 'bench'
	);

	function move(playerId: string, to: Spot) {
		message = leagues.edit(league.id, () => movePlayer(team, playerId, to, ctx));
		moving = null;
	}

	function selectWeek(value: number) {
		picked = value;
		moving = null;
		message = null;
	}

	function points(id: string): string {
		const player = pool.get(id);
		const game = player && schedule.game(player.team, week);
		if (!scored || !game || game === 'BYE' || !game.played) return '—';
		return pointsIn(player, week).toFixed(1);
	}
</script>

{#snippet playerCells(id: string | null)}
	{@const player = id ? pool.get(id) : undefined}
	{#if id && player}
		<td class="who"><PlayerName {player} /></td>
		<td class="opp">{gameLabel(schedule, player.team, week)}</td>
		<td class="num">{points(id)}</td>
		<td class="num avg">{player.average.toFixed(1)}</td>
	{:else if id}
		<td class="who muted">Unknown player</td>
		<td></td>
		<td class="num">—</td>
		<td class="num avg">—</td>
	{:else}
		<td class="who muted">Empty</td>
		<td></td>
		<td></td>
		<td class="avg"></td>
	{/if}
{/snippet}

{#snippet moveButton(id: string)}
	{#if moving === id}
		<button class="btn ghost small" onclick={() => (moving = null)}>Cancel</button>
	{:else if moving === null}
		{@const locked = isLocked(pool.get(id), week, schedule)}
		<button
			class="btn ghost small"
			disabled={locked}
			title={locked ? 'Locked: this game has been played' : undefined}
			aria-label="Move {pool.get(id)?.name ?? 'player'}"
			onclick={() => {
				moving = id;
				message = null;
			}}>{locked ? 'Locked' : 'Move'}</button
		>
	{/if}
{/snippet}

<section class="roster" aria-labelledby="roster-title">
	<div class="head">
		<h2 id="roster-title">{team.name}</h2>
		<label class="week">
			<span class="visually-hidden">Week</span>
			<select value={week} onchange={(e) => selectWeek(Number(e.currentTarget.value))}>
				{#each Array.from({ length: latest - firstWeek + 1 }, (_, i) => latest - i) as w (w)}
					<option value={w}>Week {w}{w === schedule.currentWeek ? ' (this week)' : ''}</option>
				{/each}
			</select>
		</label>
		{#if scored}
			<span class="total" aria-label="Week {week} points">{teamPoints(team, week, pool).toFixed(1)} pts</span>
		{/if}
	</div>

	{#if !editing && !readOnly}
		<p class="hint">Week {week} is over, so its lineup can't change.</p>
	{:else if editing}
		<p class="hint">Click Move, then Here to swap players. Players whose game is over are locked.</p>
	{/if}
	{#if message}<p class="error" role="alert">{message}</p>{/if}

	<div class="table-wrap">
		<table class="data-table lineup" aria-label="Starters">
			<thead>
				<tr>
					<th class="slot">Slot</th>
					<th>Starters</th>
					<th class="opp-col">Opp</th>
					<th class="num pts-col">Pts</th>
					<th class="num avg pts-col">Avg</th>
					{#if editing}<th class="act"><span class="visually-hidden">Actions</span></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each LINEUP as slot, i (i)}
					{@const id = lineup.starters[i]}
					<tr class:moving={moving !== null && moving === id}>
						<td class="slot" title={POSITION_LABELS[slot]}>{slot === 'DST' ? 'D/ST' : slot}</td>
						{@render playerCells(id)}
						{#if editing}
							<td class="act">
								{#if moving !== null && moving !== id}
									{#if moveProblem(team, moving, i, ctx) === null}
										<button class="btn small here" onclick={() => move(moving!, i)}>Here</button>
									{/if}
								{:else if id}
									{@render moveButton(id)}
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="table-wrap">
		<table class="data-table lineup" aria-label="Bench">
			<thead>
				<tr>
					<th class="slot">Slot</th>
					<th>Bench</th>
					<th class="opp-col">Opp</th>
					<th class="num pts-col">Pts</th>
					<th class="num avg pts-col">Avg</th>
					{#if editing}<th class="act"><span class="visually-hidden">Actions</span></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each lineup.bench as id (id)}
					<tr class:moving={moving === id}>
						<td class="slot">BE</td>
						{@render playerCells(id)}
						{#if editing}
							<td class="act">
								{#if typeof movingFrom === 'number'}
									<!-- Swap this bench player into the starter's slot. -->
									{#if moveProblem(team, id, movingFrom, ctx) === null}
										<button class="btn small here" onclick={() => move(id, movingFrom as number)}
											>Here</button
										>
									{/if}
								{:else}
									{@render moveButton(id)}
								{/if}
							</td>
						{/if}
					</tr>
				{:else}
					<tr><td class="slot">BE</td><td class="who muted" colspan={editing ? 5 : 4}>Nobody on the bench.</td></tr>
				{/each}
				{#if editing && typeof movingFrom === 'number'}
					<tr>
						<td class="slot">BE</td>
						<td class="who muted" colspan="4">Move to the bench</td>
						<td class="act">
							<button class="btn small here" onclick={() => move(moving!, 'bench')}>Here</button>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	{#if editing}
		<p class="hint">
			Add and drop players in <button class="link" onclick={() => (leagues.view.current = 'players')}
				>Players</button
			>.
		</p>
	{/if}
</section>

<style>
	.roster {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
	}

	/* On wider screens, starters and bench share column widths so they line up. */
	@container (min-width: 620px) {
		.lineup {
			table-layout: fixed;
		}

		.lineup .slot {
			width: 4rem;
		}

		.lineup .opp-col {
			width: 6rem;
		}

		.lineup .pts-col {
			width: 4.5rem;
		}

		.lineup .act {
			width: 6.5rem;
		}
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
	}

	h2 {
		font-size: 1.3rem;
		overflow-wrap: anywhere;
	}

	.total {
		margin-left: auto;
		font-size: 1.2rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.hint,
	.error {
		margin: 0;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.error {
		color: #ffb4b6;
	}

	.slot {
		width: 3.4rem;
		font-weight: 700;
		color: var(--muted);
	}

	.muted {
		color: var(--muted);
	}

	.link {
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent-strong);
		text-decoration: underline;
		cursor: pointer;
	}

	tr.moving td {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
	}

	.here {
		background: var(--accent);
		color: var(--bg-deep);
	}
</style>
