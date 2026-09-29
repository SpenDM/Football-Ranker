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

	it('slides the occupant right, up to the slot the moved team left', () => {
		expect(placeInSlot(['KC', 'DET', 'BAL', 'BUF'], 1, 'BUF')).toEqual(['KC', 'BUF', 'DET', 'BAL']);
	});

	it('slides the run of teams right only as far as the next empty slot', () => {
		expect(placeInSlot(['KC', 'DET', 'BAL', '', 'BUF'], 0, 'PHI')).toEqual([
			'PHI',
			'KC',
			'DET',
			'BAL',
			'BUF'
		]);
		expect(placeInSlot(['KC', '', 'DET', 'BAL', '', 'BUF'], 2, 'KC')).toEqual([
			'',
			'',
			'KC',
			'DET',
			'BAL',
			'BUF'
		]);
	});

	it('moving a team right leaves its old slot empty and slides the new slot\'s occupant', () => {
		expect(placeInSlot(['KC', 'DET', 'BAL'], 1, 'KC')).toEqual(['', 'KC', 'DET', 'BAL']);
	});

	it('moves a ranked team to an empty slot, emptying its old one', () => {
		expect(placeInSlot(['KC', 'DET'], 3, 'KC')).toEqual(['', 'DET', '', 'KC']);
	});

	it('a team pushed past the last slot returns to the pool', () => {
		const full = placeInSlot(['KC', 'DET', 'BAL'], 0, 'BUF');
		expect(full).toEqual(['BUF', 'KC', 'DET', 'BAL']);
		expect(normalizePlacement({ rank: full }, ranked)).toEqual({ rank: ['BUF', 'KC', 'DET'] });
	});

	it('dropping a team back on its own slot changes nothing', () => {
		expect(placeInSlot(['KC', 'DET'], 1, 'DET')).toEqual(['KC', 'DET']);
	});
});
