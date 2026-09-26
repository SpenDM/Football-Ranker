<script lang="ts">
	import ComingSoon from '$lib/components/ComingSoon.svelte';
	import { tools } from '$lib/tools';
</script>

<ComingSoon
	tool={tools.find((t) => t.slug === 'fantasy-draft')!}
	features={[
		'Browse every NFL roster by team and position',
		'Drag players into your own draft big board',
		'Tiers, notes, and syncing across devices'
	]}
/>
