import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function freshStores() {
	vi.resetModules();
	const { frameworks } = await import('./frameworks.svelte');
	const { rankings } = await import('./rankings.svelte');
	return { frameworks, rankings };
}

describe('frameworks store', () => {
	beforeEach(() => localStorage.clear());

	it('allows at most 5 custom frameworks', async () => {
		const { frameworks } = await freshStores();
		for (let i = 0; i < 5; i++) expect(frameworks.saveAsCustom(`f${i}`, null)).not.toBeNull();
		expect(frameworks.canSaveCustom).toBe(false);
		expect(frameworks.saveAsCustom('f6', null)).toBeNull();
		expect(frameworks.customs.current).toHaveLength(5);
	});

	it('removing a tier returns its teams to the pool', async () => {
		const { frameworks, rankings } = await freshStores();
		frameworks.select('preset-letter');
		rankings.setTier(frameworks.active, 's', ['KC']);
		rankings.setTier(frameworks.active, 'a', ['DET']);
		frameworks.removeTier('s');
		expect(frameworks.active.tiers.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd', 'f']);
		expect(rankings.for(frameworks.active)).toMatchObject({ a: ['DET'] });
		expect(rankings.placements.current['preset-letter']).not.toHaveProperty('s');
	});

	it('saving a modified preset creates a custom copy with its rankings and resets the preset', async () => {
		const { frameworks, rankings } = await freshStores();
		frameworks.select('preset-letter');
		frameworks.addTier();
		const newTier = frameworks.active.tiers.at(-1)!.id;
		rankings.setTier(frameworks.active, newTier, ['NYJ']);

		const custom = frameworks.saveAsCustom('Mine', null)!;
		expect(frameworks.active.id).toBe(custom.id);
		expect(frameworks.active.tiers).toHaveLength(7);
		expect(rankings.for(frameworks.active)[newTier]).toEqual(['NYJ']);

		frameworks.select('preset-letter');
		expect(frameworks.active.tiers).toHaveLength(6);
		expect(frameworks.activeIsModifiedPreset).toBe(false);
	});

	it('persists custom frameworks and the active selection across reloads', async () => {
		const first = await freshStores();
		const custom = first.frameworks.saveAsCustom('Keep me', null)!;
		flushSync();
		const second = await freshStores();
		expect(second.frameworks.customs.current.map((f) => f.name)).toEqual(['Keep me']);
		expect(second.frameworks.active.id).toBe(custom.id);
	});

	it('notifies sync listeners only for custom framework changes', async () => {
		const { frameworks } = await freshStores();
		const listener = vi.fn();
		frameworks.onCustomsChange(listener);
		frameworks.addTier(); // preset edit
		expect(listener).not.toHaveBeenCalled();
		frameworks.saveAsCustom('x', null);
		frameworks.addTier(); // custom edit
		expect(listener).toHaveBeenCalledTimes(2);
	});
});
