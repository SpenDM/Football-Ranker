import raw from './fantasy-teams.json';

/** Offense scores and the per-game stats behind them. */
export type OffenseStats = {
	/** (total yards + 10 × points scored) per game. */
	total: number;
	/** (rushing yards + 10 × rushing TD/2-pt points) per game. */
	rush: number;
	/** (passing yards + 10 × passing TD/2-pt points) per game. */
	pass: number;
	yardsPerGame: number;
	pointsPerGame: number;
	rushYardsPerGame: number;
	rushTdsPerGame: number;
	passYardsPerGame: number;
	passTdsPerGame: number;
};

/** Defense scores and the per-game stats behind them. */
export type DefenseStats = {
	/** Standard DST fantasy points per game. */
	total: number;
	/** PPR points allowed to opposing rushers per game (lower is better). */
	rush: number;
	/** PPR points allowed to opposing passers and receivers per game (lower is better). */
	pass: number;
	sacksPerGame: number;
	takeawaysPerGame: number;
	pointsAllowedPerGame: number;
};

type SplitScores = { total: number; rush: number; pass: number };

/** One game's final score and its score in every category (a season score is the average of
 *  these). */
export type GameLogEntry = {
	week: number;
	opponent: string;
	home: boolean;
	/** Final score: this team's points and its opponent's. */
	pointsFor: number;
	pointsAgainst: number;
	offense: SplitScores;
	defense: SplitScores;
};

/** A scheduled game that hasn't been played (or finished) yet. */
export type UpcomingGame = { week: number; opponent: string; home: boolean };

export type TeamFantasyStats = {
	abbr: string;
	games: number;
	offense: OffenseStats;
	defense: DefenseStats;
	/** Games counted so far, in week order. */
	gameLog: GameLogEntry[];
	/** The team's next game, or null once its season is over. */
	nextGame: UpcomingGame | null;
	/** Every game still to play, in week order (missing from data generated before it existed). */
	schedule?: UpcomingGame[];
};

export type FantasyTeamData = {
	season: number;
	/** Latest regular-season week with games counted (0 before the season starts). */
	throughWeek: number;
	/** False while some of that week's games aren't in yet (e.g. Monday night). */
	weekComplete: boolean;
	/** Teams by natural first-round pick in the draft before the season (pick 1 first, ignoring
	 *  trades). Week 1's power rankings are this order reversed. */
	draftOrder: string[];
	teams: TeamFantasyStats[];
};

/** Generated weekly by `pipeline/football_pipeline/fantasy.py` from nflverse stats. */
export const fantasyTeams = raw as FantasyTeamData;

export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K';

/** One game's fantasy points (PPR, or standard kicker points for kickers). */
export type PlayerGame = {
	week: number;
	opponent: string;
	home: boolean;
	points: number;
};

export type FantasyPlayer = {
	id: string;
	name: string;
	position: PlayerPosition;
	/** Current team abbreviation. */
	team: string;
	games: number;
	total: number;
	/** Points per game played. */
	average: number;
	/** Games played, in week order. */
	gameLog: PlayerGame[];
};

/** A team's D/ST game log with ESPN's default D/ST scoring (used by Leagues). */
export type FantasyDefense = Omit<FantasyPlayer, 'id' | 'name' | 'position'>;

export type FantasyPlayerData = Omit<FantasyTeamData, 'teams' | 'draftOrder'> & {
	players: FantasyPlayer[];
	defenses: FantasyDefense[];
};

/** Where the pipeline writes player data; it's served as a static file and fetched when needed. */
export const PLAYERS_PATH = '/data/fantasy-players.json';

let playersRequest: Promise<FantasyPlayerData> | undefined;

/** Fetch the player data once per page load (a failed request is retried on the next call). */
export function loadPlayers(url: string): Promise<FantasyPlayerData> {
	playersRequest ??= fetch(url)
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json() as Promise<FantasyPlayerData>;
		})
		.catch((err) => {
			playersRequest = undefined;
			throw err;
		});
	return playersRequest;
}
