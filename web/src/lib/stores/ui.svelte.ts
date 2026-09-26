import { Persisted } from './persisted.svelte';

/** Whether the Power Rankings format editor is expanded. */
export const editorOpen = new Persisted<boolean>('editorOpen', false);
