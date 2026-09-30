export type Tool = {
	slug: string;
	name: string;
	path: string;
	description: string;
	status: 'live' | 'coming-soon';
};

export const tools: Tool[] = [
	{
		slug: 'power-rankings',
		name: 'Power Rankings',
		path: '/power-rankings',
		description: 'Drag and drop all 32 teams into a 1–32 ranking or tiers of your own design.',
		status: 'live'
	},
	{
		slug: 'fantasy-roster',
		name: 'Fantasy Roster Manager',
		path: '/fantasy-roster',
		description:
			'Week-by-week start/sit help: top and bottom offenses and defenses, matchups, and more.',
		status: 'live'
	},
	{
		slug: 'leagues',
		name: 'Leagues',
		path: '/leagues',
		description:
			'Run your own fantasy leagues with up to 16 teams: set lineups, add and drop players, and track the standings.',
		status: 'live'
	},
	{
		slug: 'fantasy-draft',
		name: 'Fantasy Draft Manager',
		path: '/fantasy-draft',
		description: 'Build your own draft big board by dragging players from every NFL roster.',
		status: 'coming-soon'
	}
];

export function toolForPath(pathname: string): Tool | undefined {
	return tools.find((t) => pathname === t.path || pathname.startsWith(t.path + '/'));
}
