<script lang="ts">
	import ComingSoon from '$lib/components/ComingSoon.svelte';
	import { tools } from '$lib/tools';
</script>

<ComingSoon
	tool={tools.find((t) => t.slug === 'fantasy-roster')!}
	features={[
		'Weekly views of the top and bottom offenses and defenses',
		'Matchup strength for each of your players',
		'Start/sit comparisons you can save for each week'
	]}
/>
