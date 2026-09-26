import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { Persisted, STORAGE_PREFIX } from './persisted.svelte';

describe('Persisted', () => {
	beforeEach(() => localStorage.clear());

	it('writes deep changes to localStorage and reads them back', () => {
		const a = new Persisted('test', { list: [1] });
		a.current.list.push(2);
		flushSync();
		expect(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'test')!)).toEqual({ list: [1, 2] });
		expect(new Persisted('test', { list: [] as number[] }).current).toEqual({ list: [1, 2] });
	});

	it('falls back to the initial value when stored JSON is corrupt', () => {
		localStorage.setItem(STORAGE_PREFIX + 'bad', '{not json');
		expect(new Persisted('bad', 42).current).toBe(42);
	});
});
