import type { Framework } from './types';

export const RANKED_PRESET_ID = 'preset-ranked';
export const LETTER_PRESET_ID = 'preset-letter';
export const DEFAULT_FRAMEWORK_ID = LETTER_PRESET_ID;
export const MAX_SLOTS = 32;

export const TIER_COLORS = [
	'#ff7f7f',
	'#ffbf7f',
	'#ffdf7f',
	'#ffff7f',
	'#bfff7f',
	'#7fbfff',
	'#7f7fff',
	'#ff7fff',
	'#bf7fbf',
	'#c5cbd3'
];

export const PRESETS: readonly Framework[] = Object.freeze([
	{
		id: RANKED_PRESET_ID,
		name: '1–32 Ranking',
		kind: 'ranked',
		tiers: [{ id: 'rank', label: 'Rank', color: '#8a94a6' }],
		slots: MAX_SLOTS,
		updatedAt: 0
	},
	{
		id: LETTER_PRESET_ID,
		name: 'Letter Grades',
		kind: 'tiered',
		tiers: ['S', 'A', 'B', 'C', 'D', 'F'].map((label, i) => ({
			id: label.toLowerCase(),
			label,
			color: TIER_COLORS[i]
		})),
		slots: MAX_SLOTS,
		updatedAt: 0
	}
]);

export function isPresetId(id: string): boolean {
	return PRESETS.some((p) => p.id === id);
}

export function presetById(id: string): Framework | undefined {
	return PRESETS.find((p) => p.id === id);
}
