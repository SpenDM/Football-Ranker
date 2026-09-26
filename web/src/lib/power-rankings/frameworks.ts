import type { Framework } from './types';

export const MAX_CUSTOM_FRAMEWORKS = 5;

export function newId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function cloneFramework(fw: Framework): Framework {
	return JSON.parse(JSON.stringify(fw)) as Framework;
}

/** A new custom framework copied from `source` (tier ids are kept so placements can be copied). */
export function createCustom(source: Framework, name: string, owner: string | null): Framework {
	return {
		...cloneFramework(source),
		id: newId('custom'),
		name: name.trim() || source.name,
		updatedAt: Date.now(),
		owner
	};
}

/**
 * Merge this browser's custom frameworks with the ones stored in the user's account.
 *
 * - Guest frameworks (owner null) are adopted into the account; newest `updatedAt` wins on id clash.
 * - If this browser has unsynced changes (`localDirty`), its account frameworks are authoritative
 *   (covers edits made right before the tab closed). Otherwise the account copy is authoritative,
 *   so frameworks deleted on another device stay deleted.
 * - Frameworks belonging to a different account are dropped.
 */
export function mergeFrameworks(
	local: Framework[],
	remote: Framework[],
	uid: string,
	localDirty: boolean
): Framework[] {
	const owned = local.filter((f) => f.owner === uid);
	const guests = local.filter((f) => f.owner == null);

	const result = new Map<string, Framework>();
	for (const f of localDirty ? owned : remote) result.set(f.id, { ...f, owner: uid });
	for (const f of guests) {
		const existing = result.get(f.id);
		if (!existing || f.updatedAt > existing.updatedAt) result.set(f.id, { ...f, owner: uid });
	}
	return [...result.values()];
}

/** Strip local-only fields before writing to Firestore. */
export function toRemote(fw: Framework): Framework {
	const { owner: _owner, ...rest } = cloneFramework(fw);
	return rest;
}
