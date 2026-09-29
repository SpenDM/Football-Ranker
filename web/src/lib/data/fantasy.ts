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

/** One game's score in every category (a season score is the average of these). */
export type GameLogEntry = {
	week: number;
	opponent: string;
	home: boolean;
	offense: SplitScores;
	defense: SplitScores;
};

export type TeamFantasyStats = {
	abbr: string;
	games: number;
	offense: OffenseStats;
	defense: DefenseStats;
	/** Games counted so far, in week order. */
	gameLog: GameLogEntry[];
};

export type FantasyTeamData = {
	season: number;
	/** Latest regular-season week with games counted (0 before the season starts). */
	throughWeek: number;
	/** False while some of that week's games aren't in yet (e.g. Monday night). */
	weekComplete: boolean;
	teams: TeamFantasyStats[];
};

/** Generated weekly by `pipeline/football_pipeline/fantasy.py` from nflverse stats. */
export const fantasyTeams = raw as FantasyTeamData;
