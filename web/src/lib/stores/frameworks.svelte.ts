import {
	cloneFramework,
	createCustom,
	MAX_CUSTOM_FRAMEWORKS,
	newId
} from '$lib/power-rankings/frameworks';
import {
	DEFAULT_FRAMEWORK_ID,
	isPresetId,
	MAX_SLOTS,
	PRESETS,
	presetById,
	TIER_COLORS
} from '$lib/power-rankings/presets';
import type { Framework, Tier } from '$lib/power-rankings/types';
import { Persisted } from './persisted.svelte';
import { rankings } from './rankings.svelte';

type Listener = () => void;

class FrameworksStore {
	/** User-saved frameworks (max 5). Synced to Firestore while signed in. */
	customs = new Persisted<Framework[]>('customFrameworks', []);
	/** Unsaved edits to presets, keyed by preset id. */
	presetEdits = new Persisted<Record<string, Framework>>('presetWorkingCopies', {});
	activeId = new Persisted<string>('activeFrameworkId', DEFAULT_FRAMEWORK_ID);

	#customListeners = new Set<Listener>();

	presets = $derived(PRESETS.map((p) => this.presetEdits.current[p.id] ?? p));
	active = $derived(
		this.presets.find((f) => f.id === this.activeId.current) ??
			this.customs.current.find((f) => f.id === this.activeId.current) ??
			this.presets.find((f) => f.id === DEFAULT_FRAMEWORK_ID)!
	);
	activeIsPreset = $derived(isPresetId(this.active.id));
	activeIsModifiedPreset = $derived(Boolean(this.presetEdits.current[this.active.id]));
	canSaveCustom = $derived(this.customs.current.length < MAX_CUSTOM_FRAMEWORKS);

	/** Called whenever the user changes custom frameworks (used for cloud sync). */
	onCustomsChange(listener: Listener): () => void {
		this.#customListeners.add(listener);
		return () => this.#customListeners.delete(listener);
	}

	#customsChanged() {
		for (const l of this.#customListeners) l();
	}

	select(id: string): void {
		this.activeId.current = id;
	}

	/** Apply an edit to the active framework (presets get a local working copy). */
	#editActive(edit: (fw: Framework) => void): void {
		const fw = this.active;
		if (isPresetId(fw.id)) {
			const copy = cloneFramework(fw);
			edit(copy);
			copy.updatedAt = Date.now();
			this.presetEdits.current[fw.id] = copy;
			rankings.normalize(copy);
		} else {
			const custom = this.customs.current.find((f) => f.id === fw.id)!;
			edit(custom);
			custom.updatedAt = Date.now();
			rankings.normalize(custom);
			this.#customsChanged();
		}
	}

	addTier(): void {
		this.#editActive((fw) => {
			const used = new Set(fw.tiers.map((t) => t.color));
			fw.tiers.push({
				id: newId('tier'),
				label: 'New',
				color: TIER_COLORS.find((c) => !used.has(c)) ?? TIER_COLORS.at(-1)!
			});
		});
	}

	updateTier(tierId: string, patch: Partial<Omit<Tier, 'id'>>): void {
		this.#editActive((fw) => {
			const tier = fw.tiers.find((t) => t.id === tierId);
			if (tier) Object.assign(tier, patch);
		});
	}

	removeTier(tierId: string): void {
		if (this.active.tiers.length <= 1) return;
		this.#editActive((fw) => {
			fw.tiers = fw.tiers.filter((t) => t.id !== tierId);
		});
	}

	moveTier(tierId: string, delta: -1 | 1): void {
		this.#editActive((fw) => {
			const i = fw.tiers.findIndex((t) => t.id === tierId);
			const j = i + delta;
			if (i < 0 || j < 0 || j >= fw.tiers.length) return;
			[fw.tiers[i], fw.tiers[j]] = [fw.tiers[j], fw.tiers[i]];
		});
	}

	setSlots(slots: number): void {
		if (!Number.isFinite(slots)) return;
		this.#editActive((fw) => {
			fw.slots = Math.min(MAX_SLOTS, Math.max(1, Math.round(slots)));
		});
	}

	renameActive(name: string): void {
		if (this.activeIsPreset) return;
		this.#editActive((fw) => {
			fw.name = name;
		});
	}

	/** Discard edits to the active preset. */
	resetPreset(): void {
		const id = this.active.id;
		if (!isPresetId(id)) return;
		delete this.presetEdits.current[id];
		rankings.normalize(presetById(id)!);
	}

	/**
	 * Save the active framework's current format (and rankings) as a new custom framework and
	 * switch to it. A modified preset is reset back to its defaults.
	 */
	saveAsCustom(name: string, owner: string | null): Framework | null {
		if (!this.canSaveCustom) return null;
		const source = this.active;
		const custom = createCustom(source, name, owner);
		this.customs.current.push(custom);
		rankings.copy(source.id, custom.id);
		if (isPresetId(source.id)) this.resetPreset();
		this.select(custom.id);
		this.#customsChanged();
		return custom;
	}

	deleteCustom(id: string): void {
		this.customs.current = this.customs.current.filter((f) => f.id !== id);
		rankings.remove(id);
		this.#customsChanged();
	}

	/** Replace customs from cloud sync (does not notify listeners). */
	replaceCustoms(list: Framework[]): void {
		const keep = new Set(list.map((f) => f.id));
		for (const f of this.customs.current) if (!keep.has(f.id)) rankings.remove(f.id);
		this.customs.current = list;
	}

	/** On sign-out: remove frameworks belonging to an account from this browser. */
	removeOwned(): void {
		this.replaceCustoms(this.customs.current.filter((f) => f.owner == null));
	}
}

export const frameworks = new FrameworksStore();
