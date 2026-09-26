import { describe, expect, it } from 'vitest';
import { normalizePlacement, placedTeams, setTierTeams, unplaceTeams } from './placements';
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

	it('unplace returns teams to the pool', () => {
		const p = unplaceTeams({ s: ['KC', 'BUF'], a: ['DET'] }, ['KC', 'DET']);
		expect(p).toEqual({ s: ['BUF'], a: [] });
		expect(placedTeams(p)).toEqual(new Set(['BUF']));
	});
});
