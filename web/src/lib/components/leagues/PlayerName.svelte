<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import type { PoolPlayer } from '$lib/leagues/fantasy';

	/** A player's team logo, name, and position/team line for league tables. */
	let { player }: { player: PoolPlayer } = $props();

	const team = $derived(teamsByAbbr.get(player.team));
	const position = $derived(player.position === 'DST' ? 'D/ST' : player.position);
</script>

<span class="player">
	<span class="logo">{#if team}<img src={team.logo} alt="" class:on-color={team.logoOnColor} />{/if}</span>
	<span class="text">
		<span class="name">{player.name}</span>
		<span class="meta">{position} · {player.team}</span>
	</span>
</span>

<style>
	.player {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.logo {
		flex: none;
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
	}

	.logo img {
		max-width: 100%;
		max-height: 100%;
		filter: drop-shadow(0 0 1px rgb(255 255 255 / 0.5));
	}

	.logo img.on-color {
		filter: none;
	}

	.text {
		display: grid;
		min-width: 0;
	}

	.name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		font-size: 0.78rem;
		color: var(--muted);
	}
</style>
