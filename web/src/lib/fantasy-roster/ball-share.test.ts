import { describe, expect, it } from 'vitest';
import type { BallShareEntry } from '$lib/data/fantasy';
import { ballShareSlices, shortName } from './ball-share';

const p = (id: string, position: BallShareEntry['position'], rushes: number, targets: number) => ({
	id,
	name: `First ${id}`,
	position,
	rushes,
	targets
});

describe('shortName', () => {
	it('abbreviates the first name', () => {
		expect(shortName('Puka Nacua')).toBe('P. Nacua');
		expect(shortName('Amon-Ra St. Brown')).toBe('A. St. Brown');
		expect(shortName('Marvin Harrison Jr.')).toBe('M. Harrison Jr.');
		expect(shortName('D.J. Moore')).toBe('D. Moore');
		expect(shortName('Cher')).toBe('Cher');
	});
});

describe('ballShareSlices', () => {
	// 200 touches in all.
	const team = [
		p('wr', 'WR', 0, 60),
		p('rb', 'RB', 70, 10),
		p('qb', 'QB', 20, 0),
		p('te', 'TE', 0, 30),
		p('rb2', 'RB', 4, 1),
		p('wr2', 'WR', 0, 4),
		p('wr3', 'WR', 0, 1)
	];

	it('lists players biggest first and merges everyone under 3% into a last Other slice', () => {
		const slices = ballShareSlices(team, 'wr');
		const round = (n: number) => Math.round(n * 1e6) / 1e6;
		expect(slices.map((s) => [s.id, s.label, s.touches, round(s.share), s.highlight])).toEqual([
			['rb', 'F. rb', 80, 0.4, false],
			['wr', 'F. wr', 60, 0.3, true],
			['te', 'F. te', 30, 0.15, false],
			['qb', 'F. qb', 20, 0.1, false],
			// rb2 is 2.5%, wr2 2% and wr3 0.5%.
			[null, 'Other', 10, 0.05, false]
		]);
		expect(slices.at(-1)).toMatchObject({ players: 3, rushes: 4, targets: 6 });
		expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1);
	});

	it('keeps the highlighted player out of Other however small their share', () => {
		const slices = ballShareSlices(team, 'wr2');
		expect(slices.find((s) => s.highlight)).toMatchObject({ id: 'wr2', share: 0.02 });
		expect(slices.at(-1)).toMatchObject({ id: null, players: 2, touches: 6 });
	});

	it('has no highlight for a player without rushes or targets, and no slices for no touches', () => {
		expect(ballShareSlices(team, 'k').some((s) => s.highlight)).toBe(false);
		expect(ballShareSlices([], 'wr')).toEqual([]);
	});
});
