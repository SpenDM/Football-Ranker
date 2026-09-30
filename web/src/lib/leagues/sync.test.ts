import { describe, expect, it } from 'vitest';
import type { League } from './fantasy';
import { mergeLeagues } from './sync';

const league = (id: string, owner: string | null, updatedAt = 1) =>
	({ id, owner, updatedAt, name: id }) as League;

describe('mergeLeagues', () => {
	it('claims signed-out leagues and adds account leagues from other devices', () => {
		const { merged, upload } = mergeLeagues(
			[league('local', null)],
			[league('cloud', 'u1')],
			'u1',
			new Set()
		);
		expect(merged.map((l) => [l.id, l.owner])).toEqual([
			['local', 'u1'],
			['cloud', 'u1']
		]);
		expect([...upload]).toEqual(['local']);
	});

	it('keeps the most recently edited copy', () => {
		const { merged, upload } = mergeLeagues(
			[league('a', 'u1', 5), league('b', 'u1', 1)],
			[league('a', 'u1', 2), { ...league('b', 'u1', 9), name: 'newer' }],
			'u1',
			new Set()
		);
		expect(merged.map((l) => [l.id, l.updatedAt])).toEqual([
			['a', 5],
			['b', 9]
		]);
		expect([...upload]).toEqual(['a']);
	});

	it('drops leagues deleted elsewhere unless they have unsynced changes', () => {
		const { merged, upload } = mergeLeagues(
			[league('gone', 'u1'), league('unsynced', 'u1'), league('other', 'u2')],
			[],
			'u1',
			new Set(['unsynced'])
		);
		expect(merged.map((l) => l.id)).toEqual(['unsynced']);
		expect([...upload]).toEqual(['unsynced']);
	});

	it('keeps leagues deleted in this browser deleted', () => {
		const { merged, upload } = mergeLeagues([], [league('deleted', 'u1')], 'u1', new Set(['deleted']));
		expect(merged).toEqual([]);
		expect([...upload]).toEqual(['deleted']);
	});
});
