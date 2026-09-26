import { describe, expect, it } from 'vitest';
import {
	normalizePlacement,
	placedTeams,
	placeInSlot,
	setTierTeams,
	unplaceTeams
} from './placements';
import { PRESETS } from './presets';
import type { Framework } from './types';

const letter = PRESETS.find((p) => p.id === 'preset-letter')!;
const ranked: Framework = { ...PRESETS.find((p) => p.id === 'preset-ranked')!, slots: 3 };

describe('placements', () => {
	it('moving a team into a tier removes it from its previous tier', () => {
		const p = setTierTeams({ s: ['KC', 'BUF'], a: ['DET'] }, 'a', ['KC', 'DET']);
		expect(p).toEqual({ s: ['BUF'], a: ['KC', 'DET'] });
	});

	it('normalize drops removed tiers, duplicates and ranks beyond the slot count', () => {
		expect(normalizePlacement({ s: ['KC'], gone: ['BUF'], a: ['KC', 'DET'] }, letter)).toEqual({
			s: ['KC'],
			a: ['DET'],
			b: [],
			c: [],
			d: [],
			f: []
		});
		expect(normalizePlacement({ rank: ['KC', 'DET', 'BAL', 'BUF'] }, ranked)).toEqual({
			rank: ['KC', 'DET', 'BAL']
		});
	});

	it('ranked lists keep empty slots in place and drop duplicates positionally', () => {
		expect(normalizePlacement({ rank: ['', 'KC', 'KC', ''] }, ranked)).toEqual({
			rank: ['', 'KC']
		});
	});

	it('unplace returns teams to the pool', () => {
		const p = unplaceTeams({ s: ['KC', 'BUF'], a: ['DET'] }, ['KC', 'DET'], letter);
		expect(p).toEqual({ s: ['BUF'], a: [] });
		expect(placedTeams(p)).toEqual(new Set(['BUF']));
	});

	it('unplacing a ranked team leaves its slot empty instead of shifting ranks', () => {
		const p = unplaceTeams({ rank: ['KC', 'DET', 'BAL'] }, ['DET'], ranked);
		expect(p).toEqual({ rank: ['KC', '', 'BAL'] });
		expect(placedTeams(p)).toEqual(new Set(['KC', 'BAL']));
	});
});

describe('placeInSlot', () => {
	it('drops a team into any empty slot', () => {
		expect(placeInSlot([], 4, 'KC')).toEqual(['', '', '', '', 'KC']);
	});

	it('swaps when a ranked team is dropped on another ranked team', () => {
		expect(placeInSlot(['KC', '', 'DET'], 2, 'KC')).toEqual(['DET', '', 'KC']);
	});

	it('moves a ranked team to an empty slot, emptying its old one', () => {
		expect(placeInSlot(['KC', 'DET'], 3, 'KC')).toEqual(['', 'DET', '', 'KC']);
	});

	it('a team from the pool replaces the occupant, which returns to the pool', () => {
		expect(placeInSlot(['KC', 'DET'], 1, 'BAL')).toEqual(['KC', 'BAL']);
	});

	it('dropping a team back on its own slot changes nothing', () => {
		expect(placeInSlot(['KC', 'DET'], 1, 'DET')).toEqual(['KC', 'DET']);
	});
});
