<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		BENCH_SIZE,
		LEAGUE_TYPES,
		MAX_NAME_LENGTH,
		MAX_TEAMS,
		newTeam,
		nextTeamName,
		POSITION_MAX,
		ROSTER_SIZE,
		sharedConflicts,
		type League,
		type Schedule
	} from '$lib/leagues/fantasy';
	import { leagues } from '$lib/stores/leagues.svelte';

	let { league, schedule }: { league: League; schedule: Schedule } = $props();

	const week = $derived(schedule.currentWeek ?? schedule.throughWeek);
	const lastStartWeek = $derived(Math.max(1, week));

	let message = $state<string | null>(null);
	/** The team (or "league") whose Delete button was clicked once and awaits confirmation. */
	let confirming = $state<string | null>(null);

	function edit(change: (l: League) => string | null | void) {
		message = leagues.edit(league.id, change);
		confirming = null;
	}

	function rename(value: string, apply: (name: string) => void, fallback: string) {
		const name = value.trim().slice(0, MAX_NAME_LENGTH) || fallback;
		edit(() => {
			apply(name);
		});
	}

	function setShared(shared: boolean, input: HTMLInputElement) {
		if (!shared) {
			const conflicts = sharedConflicts(league, week).length;
			if (conflicts) {
				input.checked = true;
				message = `${conflicts} ${conflicts === 1 ? 'player is' : 'players are'} on more than one team. Drop them from all but one team first.`;
				return;
			}
		}
		edit((l) => {
			l.settings.sharedPlayers = shared;
		});
	}

	function removeTeam(id: string) {
		if (confirming !== id) {
			confirming = id;
			return;
		}
		edit((l) => {
			if (l.teams.length <= 1) return 'A league needs at least one team.';
			l.teams = l.teams.filter((t) => t.id !== id);
		});
		if (leagues.myTeam.current[league.id] === id) delete leagues.myTeam.current[league.id];
	}

	function removeLeague() {
		if (confirming !== 'league') {
			confirming = 'league';
			return;
		}
		leagues.remove(league.id);
		void goto('/leagues');
	}

	const typeLabel = $derived(LEAGUE_TYPES.find((t) => t.id === league.type)?.label ?? league.type);
</script>

<section class="settings" aria-labelledby="settings-title">
	<h2 id="settings-title">Settings</h2>
	{#if message}<p class="error" role="alert">{message}</p>{/if}

	<div class="panel">
		<h3>League</h3>
		<label class="field">
			<span>Name</span>
			<input
				type="text"
				aria-label="League name"
				value={league.name}
				maxlength={MAX_NAME_LENGTH}
				onchange={(e) => rename(e.currentTarget.value, (n) => (league.name = n), league.name)}
			/>
		</label>
		<label class="check">
			<input
				type="checkbox"
				checked={league.settings.sharedPlayers}
				onchange={(e) => setShared(e.currentTarget.checked, e.currentTarget)}
			/>
			<span>Teams can share players</span>
		</label>
		<p class="hint">When off, a player can be on only one team's roster at a time.</p>
		<label class="field">
			<span>Scoring starts</span>
			<select
				aria-label="Scoring starts"
				value={league.settings.startWeek}
				onchange={(e) => {
					const w = Number(e.currentTarget.value);
					edit((l) => {
						l.settings.startWeek = w;
					});
				}}
			>
				{#each Array.from({ length: Math.max(lastStartWeek, league.settings.startWeek) }, (_, i) => i + 1) as w (w)}
					<option value={w}>Week {w}</option>
				{/each}
			</select>
		</label>
		<p class="hint">
			Earlier weeks score each team's first lineup, so starting in Week 1 fills in the weeks before
			the league existed.
		</p>
	</div>

	<div class="panel">
		<div class="panel-head">
			<h3>Teams ({league.teams.length}/{MAX_TEAMS})</h3>
			<button
				class="btn small"
				disabled={league.teams.length >= MAX_TEAMS}
				onclick={() => edit((l) => void l.teams.push(newTeam(nextTeamName(l))))}>Add team</button
			>
		</div>
		<ul class="teams">
			{#each league.teams as t, i (t.id)}
				<li>
					<label class="team-name">
						<span class="visually-hidden">Team {i + 1} name</span>
						<input
							type="text"
							aria-label="Team {i + 1} name"
							value={t.name}
							maxlength={MAX_NAME_LENGTH}
							onchange={(e) => rename(e.currentTarget.value, (n) => (t.name = n), t.name)}
						/>
					</label>
					<button
						class="btn danger small"
						disabled={league.teams.length <= 1}
						aria-label={confirming === t.id ? `Confirm delete ${t.name}` : `Delete ${t.name}`}
						onclick={() => removeTeam(t.id)}>{confirming === t.id ? 'Confirm delete' : 'Delete'}</button
					>
				</li>
			{/each}
		</ul>
	</div>

	<div class="panel">
		<h3>Rules</h3>
		<dl class="rules">
			<dt>Type</dt>
			<dd>{typeLabel}, {league.season} season</dd>
			<dt>Scoring</dt>
			<dd>
				ESPN default (PPR): 1 per reception, 1 per 10 rushing/receiving yards, 1 per 25 passing
				yards, 6 per rushing/receiving TD, 4 per passing TD, −2 per interception or fumble lost.
				Kickers: 3–5 per field goal by distance, 1 per PAT, −1 per miss. D/ST: sacks, takeaways,
				TDs, and points and yards allowed.
			</dd>
			<dt>Lineup</dt>
			<dd>QB, RB, RB, WR, WR, TE, FLEX (RB/WR/TE), D/ST, K and {BENCH_SIZE} bench spots</dd>
			<dt>Roster</dt>
			<dd>
				{ROSTER_SIZE} players; at most {POSITION_MAX.QB} QB, {POSITION_MAX.RB} RB, {POSITION_MAX.WR}
				WR, {POSITION_MAX.TE} TE, {POSITION_MAX.DST} D/ST and {POSITION_MAX.K} K
			</dd>
		</dl>
	</div>

	<div class="panel danger-zone">
		<h3>Delete league</h3>
		<p class="hint">This removes the league and all of its teams{league.owner ? ' from your account' : ''}.</p>
		<button class="btn danger" onclick={removeLeague}
			>{confirming === 'league' ? 'Confirm delete league' : 'Delete league'}</button
		>
	</div>
</section>

<style>
	.settings {
		display: grid;
		gap: 16px;
		max-width: 720px;
	}

	h2 {
		font-size: 1.3rem;
	}

	h3 {
		font-size: 1rem;
	}

	.panel {
		display: grid;
		gap: 10px;
		padding: 16px;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius);
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.field {
		display: grid;
		gap: 6px;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.field select {
		justify-self: start;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.check input {
		width: 18px;
		height: 18px;
	}

	.hint,
	.error {
		margin: 0;
		font-size: 0.82rem;
		color: var(--muted);
	}

	.error {
		color: #ffb4b6;
	}

	.teams {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.teams li {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.team-name {
		flex: 1;
		min-width: 0;
	}

	.team-name input {
		width: 100%;
	}

	.rules {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: 6px 14px;
		margin: 0;
		font-size: 0.88rem;
	}

	.rules dt {
		font-weight: 600;
		color: var(--muted);
	}

	.rules dd {
		margin: 0;
	}

	.danger-zone {
		border-color: color-mix(in srgb, var(--danger) 60%, transparent);
	}

	.danger-zone .btn {
		justify-self: start;
	}

	@media (max-width: 480px) {
		.rules {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
