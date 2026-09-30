<script lang="ts">
	import {
		standings,
		type League,
		type LeagueTeam,
		type Pool,
		type Schedule
	} from '$lib/leagues/fantasy';

	let {
		league,
		team,
		pool,
		schedule
	}: { league: League; team: LeagueTeam; pool: Pool; schedule: Schedule } = $props();

	const table = $derived(standings(league, pool, schedule.throughWeek));
	let pickedWeek = $state<number | null>(null);
	/** The weekly ranking shown: the picked week, or the latest one. */
	const week = $derived(
		pickedWeek !== null && table.weeks.includes(pickedWeek) ? pickedWeek : table.weeks.at(-1)
	);
	const weekly = $derived(week === undefined ? [] : (table.byWeek.get(week) ?? []));
</script>

<section class="standings" aria-labelledby="standings-title">
	<h2 id="standings-title">Standings</h2>

	{#if !table.weeks.length}
		<p class="empty">
			No games have been played since Week {league.settings.startWeek}, when this league's scoring
			starts. Check back after this week's games.
		</p>
	{:else}
		<div class="panels">
			<div class="panel">
				<div class="panel-head">
					<h3 id="week-ranking">Week ranking</h3>
					<label>
						<span class="visually-hidden">Week</span>
						<select value={week} onchange={(e) => (pickedWeek = Number(e.currentTarget.value))}>
							{#each [...table.weeks].reverse() as w (w)}<option value={w}>Week {w}</option>{/each}
						</select>
					</label>
				</div>
				<div class="table-wrap">
					<table class="data-table" aria-label="Week {week} ranking">
						<thead>
							<tr>
								<th class="num">Rank</th>
								<th>Team</th>
								<th class="num">Pts</th>
							</tr>
						</thead>
						<tbody>
							{#each weekly as row (row.team.id)}
								<tr class:mine={row.team.id === team.id}>
									<td class="num rank">{row.rank}</td>
									<td class="team">{row.team.name}</td>
									<td class="num">{row.points.toFixed(1)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<div class="panel">
				<div class="panel-head">
					<h3>Season ranking</h3>
					<span class="range">
						{table.weeks.length === 1
							? `Week ${table.weeks[0]}`
							: `Weeks ${table.weeks[0]}–${table.weeks.at(-1)}`}
					</span>
				</div>
				<div class="table-wrap">
					<table class="data-table" aria-label="Season ranking">
						<thead>
							<tr>
								<th class="num">Rank</th>
								<th>Team</th>
								<th class="num">Total</th>
								<th class="num">Avg</th>
								{#each table.weeks as w (w)}<th class="num week-col" title="Week {w} points (rank)">Wk {w}</th>{/each}
							</tr>
						</thead>
						<tbody>
							{#each table.season as row (row.team.id)}
								<tr class:mine={row.team.id === team.id}>
									<td class="num rank">{row.rank}</td>
									<td class="team">{row.team.name}</td>
									<td class="num total">{row.total.toFixed(1)}</td>
									<td class="num">{(row.total / table.weeks.length).toFixed(1)}</td>
									{#each table.weeks as w (w)}
										{@const cell = row.weekly.get(w)}
										<td class="num week-col">
											{cell?.points.toFixed(1)} <span class="week-rank">#{cell?.rank}</span>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
		{#if schedule.throughWeek === table.weeks.at(-1) && schedule.currentWeek === schedule.throughWeek}
			<p class="hint">Week {schedule.throughWeek} isn't finished, so its points may still change.</p>
		{/if}
	{/if}
</section>

<style>
	.standings {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
	}

	h2 {
		font-size: 1.3rem;
	}

	h3 {
		font-size: 1rem;
	}

	.panels {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}

	@container (min-width: 820px) {
		.panels {
			grid-template-columns: minmax(240px, 1fr) minmax(0, 2.2fr);
		}
	}

	.panel {
		display: grid;
		gap: 8px;
		min-width: 0;
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 36px;
	}

	.range,
	.empty,
	.hint {
		margin: 0;
		color: var(--muted);
		font-size: 0.88rem;
	}

	.rank {
		width: 3rem;
		font-weight: 700;
	}

	.team {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.total {
		font-weight: 700;
	}

	.week-rank {
		font-size: 0.75rem;
		color: var(--muted);
	}
</style>
