<script lang="ts">
	import { teamsByAbbr } from '$lib/data/teams';
	import { LABEL_THRESHOLD, type ShareSlice } from '$lib/fantasy-roster/ball-share';

	let {
		slices,
		teamAbbr,
		playerName
	}: {
		/** The team's slices, biggest first, "Other" last (see ballShareSlices). */
		slices: ShareSlice[];
		teamAbbr: string;
		/** The clicked player. */
		playerName: string;
	} = $props();

	const WIDTH = 300;
	const HEIGHT = 196;
	const CX = WIDTH / 2;
	const CY = HEIGHT / 2;
	const R = 68;
	/** How far the highlighted slice is pulled out from the center. */
	const PULL = 6;
	/** Where name labels sit, just outside the pie. */
	const LABEL_R = R + 14;

	const team = $derived(teamsByAbbr.get(teamAbbr));
	const pct = (share: number) => `${Math.round(share * 100)}%`;
	const exactPct = (share: number) => `${(share * 100).toFixed(1)}%`;
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

	/** Each slice's wedge: angles clockwise from 12 o'clock, in radians. */
	const wedges = $derived.by(() => {
		let start = 0;
		return slices.map((slice, i) => {
			const end = start + slice.share * 2 * Math.PI;
			const mid = (start + end) / 2;
			const wedge = { slice, start, end, mid, index: i };
			start = end;
			return wedge;
		});
	});

	/** A point at radius r and angle a (clockwise from 12 o'clock). */
	const at = (r: number, a: number) => [CX + r * Math.sin(a), CY - r * Math.cos(a)];

	function path(start: number, end: number): string {
		const [x0, y0] = at(R, start);
		const [x1, y1] = at(R, end);
		const large = end - start > Math.PI ? 1 : 0;
		return `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
	}

	/** Pull the highlighted slice outward along its middle. */
	const offset = (w: { slice: ShareSlice; mid: number }) =>
		w.slice.highlight ? `translate(${PULL * Math.sin(w.mid)} ${-PULL * Math.cos(w.mid)})` : '';

	function hover(s: ShareSlice): string {
		const who = s.id === null ? `Other (${plural(s.players, 'player')})` : `${s.name} (${s.position})`;
		return `${who}: ${plural(s.rushes, 'rush')}, ${plural(s.targets, 'target')} · ${exactPct(s.share)}`;
	}

	const picked = $derived(slices.find((s) => s.highlight));
	const summary = $derived(
		`${team?.nickname ?? teamAbbr} rushes and targets: ` +
			slices.map((s) => `${s.id === null ? 'Other' : s.name} ${pct(s.share)}`).join(', ')
	);
</script>

<div class="share" role="group" aria-label="Ball Share">
	<h5>Ball Share</h5>
	<p class="sub">{team?.nickname ?? teamAbbr} rushes + targets, season to date</p>
	{#if slices.length}
		<svg viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label={summary}>
			{#each wedges as w (w.slice.id ?? 'other')}
				<g transform={offset(w)}>
					{#if w.slice.share > 0.9999}
						<circle
							cx={CX}
							cy={CY}
							r={R}
							class="slice"
							class:picked={w.slice.highlight}
							style:--team={team?.primaryColor}
						>
							<title>{hover(w.slice)}</title>
						</circle>
					{:else}
						<path
							d={path(w.start, w.end)}
							class="slice"
							class:alt={w.index % 2 === 1}
							class:other={w.slice.id === null}
							class:picked={w.slice.highlight}
							style:--team={team?.primaryColor}
						>
							<title>{hover(w.slice)}</title>
						</path>
					{/if}
				</g>
			{/each}
			{#each wedges as w (w.slice.id ?? 'other')}
				{#if w.slice.share >= LABEL_THRESHOLD || w.slice.highlight}
					{@const [x, y] = at(LABEL_R + (w.slice.highlight ? PULL : 0), w.mid)}
					<text
						{x}
						{y}
						class="label"
						class:picked={w.slice.highlight}
						text-anchor={Math.sin(w.mid) > 0.15 ? 'start' : Math.sin(w.mid) < -0.15 ? 'end' : 'middle'}
						dominant-baseline="middle"
						>{w.slice.label} <tspan class="pct">{pct(w.slice.share)}</tspan></text
					>
				{/if}
			{/each}
		</svg>
		<p class="caption">
			{#if picked}
				<strong>{playerName}</strong>: {plural(picked.rushes, 'rush')} + {plural(
					picked.targets,
					'target'
				)} = {exactPct(picked.share)}
			{:else}
				{playerName} has no rushes or targets for the {team?.nickname ?? teamAbbr} yet.
			{/if}
		</p>
	{:else}
		<p class="caption">No rushes or targets yet.</p>
	{/if}
</div>

<style>
	.share {
		padding: 8px 10px;
		background: var(--surface-2);
		border: 1px solid var(--accent-strong);
		border-radius: 8px;
		box-shadow: 0 10px 24px rgb(0 0 0 / 0.5);
		font-size: 0.85rem;
	}

	h5 {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent-strong);
	}

	.sub,
	.caption {
		margin: 2px 0 0;
		font-size: 0.76rem;
		color: var(--muted);
	}

	.caption strong {
		color: var(--text);
	}

	svg {
		display: block;
		width: 100%;
		max-width: 300px;
		height: auto;
		margin: 2px auto 0;
		overflow: visible;
	}

	/* Teammates in two alternating tones of the accent, separated by a 2px surface gap. */
	.slice {
		fill: color-mix(in srgb, var(--accent) 55%, var(--surface-2));
		stroke: var(--surface-2);
		stroke-width: 2;
		stroke-linejoin: round;
	}

	.slice.alt {
		fill: color-mix(in srgb, var(--accent) 32%, var(--surface-2));
	}

	.slice.other {
		fill: color-mix(in srgb, var(--muted) 45%, var(--surface-2));
	}

	.slice.picked {
		fill: var(--team, var(--accent-strong));
		stroke: var(--text);
		stroke-width: 1.5;
	}

	.label {
		font-size: 10.5px;
		font-weight: 600;
		fill: var(--text);
	}

	.label .pct {
		font-weight: 400;
		fill: var(--muted);
	}

	.label.picked {
		font-weight: 800;
	}
</style>
