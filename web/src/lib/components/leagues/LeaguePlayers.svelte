<script lang="ts">
	import {
		addPlayer,
		addProblem,
		dropPlayer,
		dropProblem,
		gameLabel,
		lineupFor,
		owners,
		pointsIn,
		rosterOf,
		ROSTER_SIZE,
		SLOT_POSITIONS,
		type League,
		type LeagueTeam,
		type Pool,
		type PoolPlayer,
		type Schedule,
		type SlotKind
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

	const PAGE_SIZE = 50;
	const POSITIONS: { id: SlotKind | 'ALL'; label: string }[] = [
		{ id: 'ALL', label: 'All' },
		{ id: 'QB', label: 'QB' },
		{ id: 'RB', label: 'RB' },
		{ id: 'WR', label: 'WR' },
		{ id: 'TE', label: 'TE' },
		{ id: 'FLEX', label: 'FLEX' },
		{ id: 'DST', label: 'D/ST' },
		{ id: 'K', label: 'K' }
	];

	type Status = 'available' | 'mine' | 'all';

	let position = $state<SlotKind | 'ALL'>('ALL');
	let status = $state<Status>('available');
	let search = $state('');
	let limit = $state(PAGE_SIZE);
	/** The player being added while the user picks someone to drop. */
	let adding = $state<string | null>(null);
	let message = $state<{ text: string; error: boolean } | null>(null);

	const week = $derived(schedule.currentWeek ?? schedule.throughWeek);
	const ctx = $derived({ pool, schedule, week });
	const ownership = $derived(owners(league, week));
	const roster = $derived(rosterOf(lineupFor(team, week)));
	const lastWeek = $derived(schedule.throughWeek);

	function isMine(id: string): boolean {
		return roster.includes(id);
	}

	function isAvailable(id: string): boolean {
		return !isMine(id) && (league.settings.sharedPlayers || !ownership.has(id));
	}

	const rows = $derived.by(() => {
		const query = search.trim().toLowerCase();
		return [...pool.values()].filter(
			(p) =>
				(position === 'ALL' || SLOT_POSITIONS[position].includes(p.position)) &&
				(status === 'all' || (status === 'mine' ? isMine(p.id) : isAvailable(p.id))) &&
				(!query || p.name.toLowerCase().includes(query) || p.team.toLowerCase() === query)
		);
	});

	function ownerText(id: string): string {
		if (isMine(id)) return 'Your team';
		const teams = ownership.get(id);
		return teams?.length ? teams.map((t) => t.name).join(', ') : 'Free agent';
	}

	function name(id: string): string {
		return pool.get(id)?.name ?? 'Player';
	}

	function add(id: string) {
		const problem = addProblem(league, team, id, null, ctx);
		if (problem === null) {
			finish(leagues.edit(league.id, () => addPlayer(league, team, id, null, ctx)), `Added ${name(id)}.`);
		} else if (roster.some((drop) => addProblem(league, team, id, drop, ctx) === null)) {
			adding = id;
			message = null;
		} else {
			message = { text: problem, error: true };
		}
	}

	function addAndDrop(id: string, drop: string) {
		finish(
			leagues.edit(league.id, () => addPlayer(league, team, id, drop, ctx)),
			`Added ${name(id)} and dropped ${name(drop)}.`
		);
	}

	function drop(id: string) {
		finish(leagues.edit(league.id, () => dropPlayer(team, id, ctx)), `Dropped ${name(id)}.`);
	}

	function finish(problem: string | null, success: string) {
		adding = null;
		message = problem ? { text: problem, error: true } : { text: success, error: false };
	}

	function lastPoints(p: PoolPlayer): string {
		return lastWeek && p.points.has(lastWeek) ? pointsIn(p, lastWeek).toFixed(1) : '—';
	}
</script>

<section class="players" aria-labelledby="players-title">
	<div class="head">
		<h2 id="players-title">Players</h2>
		<span class="count">{roster.length}/{ROSTER_SIZE} on {team.name}</span>
	</div>

	<div class="filters">
		<div class="positions" role="group" aria-label="Position">
			{#each POSITIONS as p (p.id)}
				<button
					class="btn ghost small"
					aria-pressed={position === p.id}
					onclick={() => {
						position = p.id;
						limit = PAGE_SIZE;
					}}>{p.label}</button
				>
			{/each}
		</div>
		<label>
			<span class="visually-hidden">Show</span>
			<select aria-label="Show" bind:value={status} onchange={() => (limit = PAGE_SIZE)}>
				<option value="available">Available</option>
				<option value="mine">On {team.name}</option>
				<option value="all">All players</option>
			</select>
		</label>
		<label class="search">
			<span class="visually-hidden">Search players</span>
			<input
				type="text"
				aria-label="Search players"
				placeholder="Search by name or team"
				bind:value={search}
				oninput={() => (limit = PAGE_SIZE)}
			/>
		</label>
	</div>

	{#if message}
		<p class="message" class:error={message.error} role={message.error ? 'alert' : 'status'}>
			{message.text}
		</p>
	{/if}

	{#if adding}
		<div class="drop-picker" role="group" aria-label="Choose a player to drop">
			<div class="picker-head">
				<strong>Add {name(adding)}: choose a player to drop</strong>
				<button class="btn ghost small" onclick={() => (adding = null)}>Cancel</button>
			</div>
			<ul>
				{#each roster as id (id)}
					{@const player = pool.get(id)}
					{@const problem = addProblem(league, team, adding, id, ctx)}
					<li>
						{#if player}<PlayerName {player} />{:else}<span>Unknown player</span>{/if}
						<button
							class="btn danger small"
							disabled={problem !== null}
							title={problem ?? undefined}
							aria-label="Drop {name(id)}"
							onclick={() => addAndDrop(adding!, id)}>Drop</button
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="table-wrap">
		<table class="data-table" aria-label="Players list">
			<thead>
				<tr>
					<th>Player</th>
					<th>{schedule.currentWeek ? `Wk ${schedule.currentWeek}` : 'Opp'}</th>
					<th class="num avg">GP</th>
					<th class="num">Avg</th>
					<th class="num">Total</th>
					<th class="num avg">{lastWeek ? `Wk ${lastWeek}` : 'Last'}</th>
					<th>Status</th>
					{#if !readOnly}<th class="act"><span class="visually-hidden">Actions</span></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each rows.slice(0, limit) as p (p.id)}
					<tr class:mine={isMine(p.id)}>
						<td class="who"><PlayerName player={p} /></td>
						<td class="opp">{gameLabel(schedule, p.team, week)}</td>
						<td class="num avg">{p.games}</td>
						<td class="num">{p.average.toFixed(1)}</td>
						<td class="num">{p.total.toFixed(1)}</td>
						<td class="num avg">{lastPoints(p)}</td>
						<td class="owner">{ownerText(p.id)}</td>
						{#if !readOnly}
							<td class="act">
								{#if isMine(p.id)}
									{@const problem = dropProblem(team, p.id, ctx)}
									<button
										class="btn danger small"
										disabled={problem !== null}
										title={problem ?? undefined}
										aria-label="Drop {p.name}"
										onclick={() => drop(p.id)}>Drop</button
									>
								{:else if isAvailable(p.id)}
									<button
										class="btn small"
										aria-label="Add {p.name}"
										disabled={adding === p.id}
										onclick={() => add(p.id)}>Add</button
									>
								{/if}
							</td>
						{/if}
					</tr>
				{:else}
					<tr><td colspan="8" class="none">No players match.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if rows.length > limit}
		<button class="btn ghost more" onclick={() => (limit += PAGE_SIZE)}>
			Show more ({rows.length - limit} left)
		</button>
	{/if}
</section>

<style>
	.players {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px 14px;
	}

	h2 {
		font-size: 1.3rem;
	}

	.count {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.positions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.positions .btn[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg-deep);
	}

	.search {
		flex: 1 1 200px;
	}

	.search input {
		width: 100%;
	}

	.message {
		margin: 0;
		font-size: 0.88rem;
	}

	.message.error {
		color: #ffb4b6;
	}

	.drop-picker {
		display: grid;
		gap: 10px;
		padding: 12px;
		border: 1px solid var(--accent-strong);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.picker-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.drop-picker ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 6px 14px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.drop-picker li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-width: 0;
	}

	.owner {
		font-size: 0.82rem;
		color: var(--muted);
	}

	tr.mine .owner {
		color: var(--text);
		font-weight: 600;
	}

	.none {
		color: var(--muted);
	}

	.more {
		justify-self: center;
	}
</style>
