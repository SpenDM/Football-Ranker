import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	query,
	setDoc,
	where
} from 'firebase/firestore';
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

const league = (id: string, owner: string, teams = 10) => ({
	id,
	name: 'League',
	type: 'fantasy',
	season: 2026,
	owner,
	createdAt: 1,
	updatedAt: 1,
	settings: { sharedPlayers: false, startWeek: 1 },
	teams: Array.from({ length: teams }, (_, i) => ({ id: `t${i}`, name: `Team ${i}`, lineups: {} }))
});

describe('leagues/{leagueId}', () => {
	it('lets a user create, update, query and delete their own leagues', async () => {
		const db = env.authenticatedContext('alice').firestore();
		await assertSucceeds(setDoc(doc(db, 'leagues/l1'), league('l1', 'alice', 16)));
		await assertSucceeds(setDoc(doc(db, 'leagues/l1'), { ...league('l1', 'alice'), name: 'New' }));
		await assertSucceeds(getDoc(doc(db, 'leagues/l1')));
		await assertSucceeds(getDocs(query(collection(db, 'leagues'), where('owner', '==', 'alice'))));
		await assertSucceeds(deleteDoc(doc(db, 'leagues/l1')));
		await assertSucceeds(deleteDoc(doc(db, 'leagues/never-uploaded')));
	});

	it('rejects leagues owned by someone else, over 16 teams, or with unexpected fields', async () => {
		const db = env.authenticatedContext('alice').firestore();
		await assertFails(setDoc(doc(db, 'leagues/l1'), league('l1', 'bob')));
		await assertFails(setDoc(doc(db, 'leagues/l1'), league('l1', 'alice', 17)));
		await assertFails(setDoc(doc(db, 'leagues/l1'), league('other-id', 'alice')));
		await assertFails(setDoc(doc(db, 'leagues/l1'), { ...league('l1', 'alice'), admin: true }));
	});

	it("blocks access to other users' leagues and to signed-out visitors", async () => {
		await env.withSecurityRulesDisabled((ctx) =>
			setDoc(doc(ctx.firestore(), 'leagues/l1'), league('l1', 'alice'))
		);
		const bob = env.authenticatedContext('bob').firestore();
		await assertFails(getDoc(doc(bob, 'leagues/l1')));
		await assertFails(setDoc(doc(bob, 'leagues/l1'), league('l1', 'bob')));
		await assertFails(deleteDoc(doc(bob, 'leagues/l1')));
		await assertFails(getDocs(query(collection(bob, 'leagues'), where('owner', '==', 'alice'))));
		const anon = env.unauthenticatedContext().firestore();
		await assertFails(getDoc(doc(anon, 'leagues/l1')));
	});
});
