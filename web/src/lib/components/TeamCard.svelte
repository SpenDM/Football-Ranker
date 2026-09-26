<script lang="ts">
	import type { Team } from '$lib/data/teams';

	let { team, rank }: { team: Team; rank?: number } = $props();
</script>

<div
	class="card"
	style:--primary={team.primaryColor}
	style:--secondary={team.secondaryColor}
	title={rank ? `#${rank} ${team.name}` : team.name}
>
	<img src={team.logo} alt="" draggable="false" />
	<span class="abbr">{team.abbr}</span>
	{#if rank}<span class="rank">{rank}</span>{/if}
</div>

<style>
	.card {
		position: relative;
		width: var(--card-size);
		height: var(--card-size);
		border-radius: 10px;
		border: 2px solid var(--secondary);
		background: radial-gradient(
			circle at 50% 38%,
			color-mix(in srgb, var(--primary) 78%, white 22%) 0%,
			var(--primary) 70%
		);
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.45);
		display: grid;
		place-items: center;
		overflow: visible;
		user-select: none;
		cursor: grab;
	}

	img {
		width: 74%;
		height: 74%;
		margin-bottom: 10px;
		object-fit: contain;
		filter: drop-shadow(0 0 1px rgb(255 255 255 / 0.9)) drop-shadow(0 1px 2px rgb(0 0 0 / 0.55));
		pointer-events: none;
	}

	.abbr {
		position: absolute;
		inset: auto 0 0 0;
		padding: 1px 0;
		border-radius: 0 0 8px 8px;
		background: rgb(0 0 0 / 0.45);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-align: center;
		color: #fff;
	}

	.rank {
		position: absolute;
		top: -7px;
		left: -7px;
		min-width: 22px;
		height: 22px;
		padding: 0 4px;
		border-radius: 11px;
		background: var(--accent-strong);
		color: var(--bg-deep);
		font-size: 0.72rem;
		font-weight: 800;
		display: grid;
		place-items: center;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.5);
	}
</style>
