import { describe, expect, it } from 'vitest';
import { mergeFrameworks, toRemote } from './frameworks';
import type { Framework } from './types';

const fw = (id: string, updatedAt: number, owner?: string | null): Framework => ({
	id,
	name: id,
	kind: 'tiered',
	tiers: [{ id: 's', label: 'S', color: '#fff' }],
	slots: 32,
	updatedAt,
	owner
});

describe('mergeFrameworks', () => {
	it('adopts guest frameworks into the account and keeps remote ones', () => {
		const merged = mergeFrameworks([fw('g1', 5, null)], [fw('r1', 1)], 'u1', false);
		expect(merged.map((f) => [f.id, f.owner])).toEqual([
			['r1', 'u1'],
			['g1', 'u1']
		]);
	});

	it('newest version wins when a guest framework clashes with a remote one', () => {
		const merged = mergeFrameworks([fw('x', 10, null)], [fw('x', 3)], 'u1', false);
		expect(merged).toHaveLength(1);
		expect(merged[0].updatedAt).toBe(10);
	});

	it('when clean, the account is authoritative for account frameworks (deletions stick)', () => {
		const merged = mergeFrameworks([fw('a', 9, 'u1'), fw('b', 9, 'u1')], [fw('a', 1)], 'u1', false);
		expect(merged.map((f) => [f.id, f.updatedAt])).toEqual([['a', 1]]);
	});

	it('when dirty, unsynced local account changes win', () => {
		const merged = mergeFrameworks([fw('a', 9, 'u1'), fw('b', 9, 'u1')], [fw('a', 1)], 'u1', true);
		expect(merged.map((f) => [f.id, f.updatedAt])).toEqual([
			['a', 9],
			['b', 9]
		]);
	});

	it("drops frameworks belonging to another account and can exceed the limit (caller decides)", () => {
		const local = [fw('other', 1, 'u2'), ...['1', '2', '3'].map((id) => fw(id, 1, null))];
		const remote = ['4', '5', '6'].map((id) => fw(id, 1));
		const merged = mergeFrameworks(local, remote, 'u1', false);
		expect(merged.map((f) => f.id).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
	});

	it('toRemote strips local-only fields', () => {
		expect(toRemote(fw('a', 1, 'u1'))).not.toHaveProperty('owner');
	});
});
