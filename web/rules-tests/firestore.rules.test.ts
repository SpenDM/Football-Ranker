import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const frameworks = (n: number) =>
	Array.from({ length: n }, (_, i) => ({
		id: `custom-${i}`,
		name: `F${i}`,
		kind: 'tiered',
		tiers: [],
		slots: 32,
		updatedAt: 1
	}));

beforeAll(async () => {
	env = await initializeTestEnvironment({
		projectId: 'demo-football-tools',
		firestore: { rules: readFileSync('../firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
	});
});

beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

describe('users/{uid}', () => {
	it('lets a user write and read their own document with up to 5 frameworks', async () => {
		const db = env.authenticatedContext('alice').firestore();
		await assertSucceeds(setDoc(doc(db, 'users/alice'), { frameworks: frameworks(5), updatedAt: 1 }));
		await assertSucceeds(getDoc(doc(db, 'users/alice')));
	});

	it('rejects more than 5 frameworks', async () => {
		const db = env.authenticatedContext('alice').firestore();
		await assertFails(setDoc(doc(db, 'users/alice'), { frameworks: frameworks(6), updatedAt: 1 }));
	});

	it('rejects unexpected fields', async () => {
		const db = env.authenticatedContext('alice').firestore();
		await assertFails(
			setDoc(doc(db, 'users/alice'), { frameworks: [], updatedAt: 1, admin: true })
		);
	});

	it("blocks access to other users' documents and to signed-out visitors", async () => {
		await env.withSecurityRulesDisabled((ctx) =>
			setDoc(doc(ctx.firestore(), 'users/alice'), { frameworks: [], updatedAt: 1 })
		);
		const bob = env.authenticatedContext('bob').firestore();
		await assertFails(getDoc(doc(bob, 'users/alice')));
		await assertFails(setDoc(doc(bob, 'users/alice'), { frameworks: [], updatedAt: 1 }));
		const anon = env.unauthenticatedContext().firestore();
		await assertFails(getDoc(doc(anon, 'users/alice')));
	});
});
