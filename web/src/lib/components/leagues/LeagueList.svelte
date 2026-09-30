<script lang="ts">
	import { goto } from '$app/navigation';
	import { fantasyTeams } from '$lib/data/fantasy';
	import {
		buildSchedule,
		LEAGUE_TYPES,
		MAX_LEAGUES,
		MAX_NAME_LENGTH,
		MAX_TEAMS,
		type LeagueType
	} from '$lib/leagues/fantasy';
	import { auth } from '$lib/stores/auth.svelte';
	import { leagues } from '$lib/stores/leagues.svelte';

	let { missing = false }: { /** A league link didn't match any league. */ missing?: boolean } =
		$props();

	const schedule = buildSchedule(fantasyTeams);

	let name = $state('');
	let type = $state<LeagueType>('fantasy');
	let teamCount = $state(10);
	let sharedPlayers = $state(false);

	function create(e: SubmitEvent) {
		e.preventDefault();
		const league = leagues.create(
			{ name, type, teamCount, sharedPlayers },
			{
				season: schedule.season,
				week: schedule.currentWeek ?? schedule.throughWeek,
				owner: auth.user?.uid ?? null
			}
		);
		if (league) void goto(`/leagues?league=${league.id}`);
	}

	const typeLabel = (id: LeagueType) => LEAGUE_TYPES.find((t) => t.id === id)?.label ?? id;
</script>

<div class="page">
	{#if missing}
		<p class="notice" role="status">That league isn't in this browser. It may have been deleted.</p>
	{/if}

	<section aria-labelledby="your-leagues">
		<h2 id="your-leagues">Your leagues</h2>
		{#if leagues.list.current.length}
			<ul class="leagues">
				{#each leagues.list.current as league (league.id)}
					<li>
						<a class="league" href="/leagues?league={league.id}">
							<span class="name">{league.name}</span>
							<span class="meta">
								{typeLabel(league.type)} · {league.teams.length}
								{league.teams.length === 1 ? 'team' : 'teams'} · {league.season}
							</span>
							<span class="go" aria-hidden="true">Open →</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">No leagues yet. Create one below.</p>
		{/if}
		<p class="hint">
			{#if auth.user}
				Leagues are saved to your account.
			{:else}
				Leagues are saved in this browser. Log in to keep them in your account.
			{/if}
		</p>
	</section>

	<section aria-labelledby="create-league">
		<h2 id="create-league">Create a league</h2>
		{#if leagues.canCreate}
			<form class="create" onsubmit={create}>
				<div class="field">
					<label for="league-name">League name</label>
					<input
						id="league-name"
						type="text"
						bind:value={name}
						maxlength={MAX_NAME_LENGTH}
						placeholder="My League"
					/>
				</div>
				<div class="field">
					<label for="league-type">Type</label>
					<select id="league-type" bind:value={type}>
						{#each LEAGUE_TYPES as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
						<option disabled>More types coming soon</option>
					</select>
				</div>
				<div class="field">
					<label for="league-teams">Teams</label>
					<select id="league-teams" bind:value={teamCount}>
						{#each Array.from({ length: MAX_TEAMS }, (_, i) => i + 1) as n (n)}
							<option value={n}>{n}</option>
						{/each}
					</select>
				</div>
				<label class="check">
					<input type="checkbox" bind:checked={sharedPlayers} />
					<span>Teams can share players</span>
				</label>
				<p class="hint">
					ESPN's default fantasy settings: PPR scoring; QB, 2 RB, 2 WR, TE, FLEX, D/ST and K
					starters with 7 bench spots. You can rename, add and remove teams (up to {MAX_TEAMS}) in
					the league's settings.
				</p>
				<button class="btn" type="submit">Create league</button>
			</form>
		{:else}
			<p class="empty">You have {MAX_LEAGUES} leagues, the most allowed. Delete one to create another.</p>
		{/if}
	</section>
</div>

<style>
	.page {
		display: grid;
		gap: 28px;
		max-width: 760px;
		margin: 8px auto 0;
	}

	h2 {
		margin-bottom: 12px;
		padding-bottom: 6px;
		font-size: 1.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.notice {
		margin: 0;
		padding: 10px 14px;
		border: 1px solid var(--danger);
		border-radius: var(--radius);
	}

	.leagues {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.league {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 2px 12px;
		align-items: center;
		padding: 14px 16px;
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		background: linear-gradient(160deg, var(--surface-2), var(--surface));
		color: var(--text);
		text-decoration: none;
	}

	.league:hover {
		border-color: var(--accent-strong);
	}

	.name {
		font-size: 1.1rem;
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	.meta {
		grid-row: 2;
		color: var(--muted);
		font-size: 0.88rem;
	}

	.go {
		grid-row: 1 / span 2;
		grid-column: 2;
		font-weight: 600;
		color: var(--accent-strong);
	}

	.create {
		display: grid;
		gap: 14px;
		padding: 18px;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: var(--radius);
	}

	.field {
		display: grid;
		gap: 6px;
	}

	.field label,
	.check {
		font-size: 0.88rem;
		font-weight: 600;
	}

	.create label.check {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.create input[type='checkbox'] {
		width: 18px;
		height: 18px;
	}

	.create .btn {
		justify-self: start;
	}

	.empty,
	.hint {
		margin: 0;
		color: var(--muted);
		font-size: 0.88rem;
	}

	section > .hint {
		margin-top: 10px;
	}
</style>
