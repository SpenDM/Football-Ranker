import type { League } from './fantasy';

/**
 * Merge this browser's leagues with an account's leagues from Firestore on sign-in.
 *
 * - Leagues made while signed out join the account.
 * - A league in both places keeps whichever copy was edited last.
 * - An account league missing from Firestore was deleted on another device, unless this browser
 *   has unsynced changes to it (`pending`).
 * - A Firestore league that's pending here was deleted in this browser, so it stays deleted.
 *
 * @returns The merged list, and the ids to write to (or delete from) Firestore.
 */
export function mergeLeagues(
	local: League[],
	remote: League[],
	uid: string,
	pending: Set<string>
): { merged: League[]; upload: Set<string> } {
	const remoteById = new Map(remote.map((l) => [l.id, l]));
	const merged: League[] = [];
	const upload = new Set<string>();

	for (const league of local) {
		const cloud = remoteById.get(league.id);
		if (league.owner === null) {
			merged.push({ ...league, owner: uid });
			upload.add(league.id);
		} else if (league.owner !== uid) {
			continue;
		} else if (cloud) {
			const localIsNewer = league.updatedAt > cloud.updatedAt;
			merged.push(localIsNewer ? league : cloud);
			if (localIsNewer) upload.add(league.id);
		} else if (pending.has(league.id)) {
			merged.push(league);
			upload.add(league.id);
		}
	}

	const kept = new Set(merged.map((l) => l.id));
	for (const league of remote) {
		if (kept.has(league.id)) continue;
		if (pending.has(league.id)) upload.add(league.id);
		else merged.push(league);
	}
	return { merged, upload };
}
