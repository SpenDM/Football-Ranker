"""Build the weekly fantasy dataset consumed by the Fantasy Roster Manager.

Pulls nflverse's weekly team and player stats plus the schedule (for final scores), then writes:
- web/src/lib/data/fantasy-teams.json: per-team offense and defense scores (Team mode)
- web/static/data/fantasy-players.json: weekly PPR points for every QB/RB/WR/TE (Player mode)

Only regular-season games that have both stats and a final score are counted. Scores are per
game played, so bye weeks don't count against a team.

Usage: python -m football_pipeline.fantasy [--season 2026]
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
from collections import defaultdict
from pathlib import Path

import requests

RELEASES = "https://github.com/nflverse/nflverse-data/releases/download"
TEAM_STATS_URL = RELEASES + "/stats_team/stats_team_week_{season}.csv"
PLAYER_STATS_URL = RELEASES + "/stats_player/stats_player_week_{season}.csv"
SCHEDULE_URL = "https://github.com/nflverse/nfldata/raw/master/data/games.csv"

REPO_ROOT = Path(__file__).resolve().parents[2]
TEAMS_JSON = REPO_ROOT / "web" / "src" / "lib" / "data" / "fantasy-teams.json"
PLAYERS_JSON = REPO_ROOT / "web" / "static" / "data" / "fantasy-players.json"

# nflverse stats and schedules use "LA" for the Rams; the app uses "LAR".
TEAM_ALIASES = {"LA": "LAR"}

FANTASY_POSITIONS = {"QB", "RB", "WR", "TE"}

# Offense scores count each point scored as this many yards.
POINT_WEIGHT = 10

# Standard DST scoring for points allowed: (max points allowed, fantasy points).
POINTS_ALLOWED_TIERS = [(0, 10), (6, 7), (13, 4), (20, 1), (27, 0), (34, -1)]
POINTS_ALLOWED_FLOOR = -4


def team_abbr(abbr: str) -> str:
    return TEAM_ALIASES.get(abbr, abbr)


def num(row: dict, key: str) -> float:
    value = row.get(key, "")
    return float(value) if value not in ("", "NA") else 0.0


def fetch_csv(url: str) -> list[dict] | None:
    """Rows of a CSV, or None if it isn't published (e.g. a season with no games yet)."""
    resp = requests.get(url, timeout=60)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return list(csv.DictReader(io.StringIO(resp.text)))


def default_season(today: dt.date) -> int:
    """The NFL season in progress (or most recently finished) on a date."""
    return today.year if today.month >= 9 else today.year - 1


def final_scores(schedule: list[dict], season: int) -> dict[str, dict]:
    """Regular-season games of a season that have a final score, keyed by game_id."""
    return {
        g["game_id"]: g
        for g in schedule
        if g["season"] == str(season) and g["game_type"] == "REG" and g["home_score"] != ""
    }


def points_for_and_against(game: dict, team: str) -> tuple[int, int]:
    home, away = int(game["home_score"]), int(game["away_score"])
    return (home, away) if team_abbr(game["home_team"]) == team else (away, home)


def rushing_fantasy_points(row: dict) -> float:
    """PPR points from rushing in one stats row."""
    return (
        0.1 * num(row, "rushing_yards")
        + 6 * num(row, "rushing_tds")
        + 2 * num(row, "rushing_2pt_conversions")
        - 2 * num(row, "rushing_fumbles_lost")
    )


def passing_fantasy_points(row: dict) -> float:
    """PPR points from passing plays in one team stats row: the passers' plus the receivers'."""
    passer = (
        0.04 * num(row, "passing_yards")
        + 4 * num(row, "passing_tds")
        - 2 * num(row, "passing_interceptions")
        + 2 * num(row, "passing_2pt_conversions")
        - 2 * num(row, "sack_fumbles_lost")
    )
    receivers = (
        num(row, "receptions")
        + 0.1 * num(row, "receiving_yards")
        + 6 * num(row, "receiving_tds")
        + 2 * num(row, "receiving_2pt_conversions")
        - 2 * num(row, "receiving_fumbles_lost")
    )
    return passer + receivers


def points_allowed_score(points_allowed: int) -> int:
    for max_allowed, score in POINTS_ALLOWED_TIERS:
        if points_allowed <= max_allowed:
            return score
    return POINTS_ALLOWED_FLOOR


def dst_fantasy_points(row: dict, points_allowed: int) -> float:
    """Standard DST fantasy points for one team stats row."""
    touchdowns = (
        num(row, "def_tds") + num(row, "fumble_recovery_tds") + num(row, "special_teams_tds")
    )
    blocked_kicks = (
        num(row, "def_punt_blocks") + num(row, "def_fg_blocks") + num(row, "def_pat_blocks")
    )
    return (
        num(row, "def_sacks")
        + 2 * num(row, "def_interceptions")
        + 2 * num(row, "fumble_recovery_opp")
        + 2 * num(row, "def_safeties")
        + 2 * blocked_kicks
        + 6 * touchdowns
        + points_allowed_score(points_allowed)
    )


def build_team_rankings(team_rows: list[dict], scores: dict[str, dict]) -> list[dict]:
    """Per-team offense and defense scores, per game played, sorted by team abbreviation."""
    totals: dict[str, defaultdict[str, float]] = defaultdict(lambda: defaultdict(float))
    for row in team_rows:
        game = scores.get(row["game_id"])
        if row["season_type"] != "REG" or game is None:
            continue
        team, opponent = team_abbr(row["team"]), team_abbr(row["opponent_team"])
        points, allowed = points_for_and_against(game, team)

        t = totals[team]
        t["games"] += 1
        t["points"] += points
        t["points_allowed"] += allowed
        t["pass_yards"] += num(row, "passing_yards")
        t["pass_tds"] += num(row, "passing_tds")
        t["pass_points"] += 6 * num(row, "passing_tds") + 2 * num(row, "passing_2pt_conversions")
        t["rush_yards"] += num(row, "rushing_yards")
        t["rush_tds"] += num(row, "rushing_tds")
        t["rush_points"] += 6 * num(row, "rushing_tds") + 2 * num(row, "rushing_2pt_conversions")
        t["dst_points"] += dst_fantasy_points(row, allowed)
        t["sacks"] += num(row, "def_sacks")
        t["takeaways"] += num(row, "def_interceptions") + num(row, "fumble_recovery_opp")

        # This offense's fantasy output is what the opponent's defense allowed.
        totals[opponent]["rush_fp_allowed"] += rushing_fantasy_points(row)
        totals[opponent]["pass_fp_allowed"] += passing_fantasy_points(row)

    teams = []
    for abbr in sorted(totals):
        t = totals[abbr]
        games = t["games"]
        if not games:
            continue

        def per_game(value: float, games: float = games) -> float:
            return round(value / games, 1)

        yards = t["pass_yards"] + t["rush_yards"]

        teams.append(
            {
                "abbr": abbr,
                "games": int(games),
                "offense": {
                    "total": per_game(yards + POINT_WEIGHT * t["points"]),
                    "rush": per_game(t["rush_yards"] + POINT_WEIGHT * t["rush_points"]),
                    "pass": per_game(t["pass_yards"] + POINT_WEIGHT * t["pass_points"]),
                    "yardsPerGame": per_game(yards),
                    "pointsPerGame": per_game(t["points"]),
                    "rushYardsPerGame": per_game(t["rush_yards"]),
                    "rushTdsPerGame": per_game(t["rush_tds"]),
                    "passYardsPerGame": per_game(t["pass_yards"]),
                    "passTdsPerGame": per_game(t["pass_tds"]),
                },
                "defense": {
                    "total": per_game(t["dst_points"]),
                    "rush": per_game(t["rush_fp_allowed"]),
                    "pass": per_game(t["pass_fp_allowed"]),
                    "sacksPerGame": per_game(t["sacks"]),
                    "takeawaysPerGame": per_game(t["takeaways"]),
                    "pointsAllowedPerGame": per_game(t["points_allowed"]),
                },
            }
        )
    return teams


def build_players(player_rows: list[dict], scores: dict[str, dict]) -> list[dict]:
    """Weekly PPR points for each fantasy-position player, highest season total first."""
    players: dict[str, dict] = {}
    for row in sorted(player_rows, key=lambda r: int(r["week"])):
        if (
            row["season_type"] != "REG"
            or row["game_id"] not in scores
            or row["position"] not in FANTASY_POSITIONS
        ):
            continue
        player = players.setdefault(
            row["player_id"],
            {
                "id": row["player_id"],
                "name": row["player_display_name"],
                "position": row["position"],
                "team": "",
                "total": 0.0,
                "weeks": {},
            },
        )
        # Rows are in week order, so this ends on the player's current team.
        player["team"] = team_abbr(row["team"])
        points = num(row, "fantasy_points_ppr")
        player["weeks"][row["week"]] = round(points, 2)
        player["total"] += points

    for player in players.values():
        player["total"] = round(player["total"], 2)
    return sorted(players.values(), key=lambda p: (-p["total"], p["name"]))


def week_status(team_rows: list[dict], schedule: list[dict], season: int) -> tuple[int, bool]:
    """The latest week with counted games, and whether every game that week is counted."""
    scores = final_scores(schedule, season)
    counted = {r["game_id"] for r in team_rows if r["game_id"] in scores}
    if not counted:
        return 0, False
    through = max(int(scores[g]["week"]) for g in counted)
    scheduled = {
        g["game_id"]
        for g in schedule
        if g["season"] == str(season) and g["game_type"] == "REG" and int(g["week"]) == through
    }
    return through, scheduled <= counted


def load_season(season: int) -> tuple[int, list[dict], list[dict], list[dict]]:
    """Fetch a season's data, falling back to the previous season if it hasn't started yet."""
    schedule = fetch_csv(SCHEDULE_URL)
    if schedule is None:
        raise SystemExit("Schedule not found at " + SCHEDULE_URL)
    for candidate in (season, season - 1):
        team_rows = fetch_csv(TEAM_STATS_URL.format(season=candidate))
        scores = final_scores(schedule, candidate)
        if team_rows and any(r["game_id"] in scores for r in team_rows):
            player_rows = fetch_csv(PLAYER_STATS_URL.format(season=candidate)) or []
            return candidate, team_rows, player_rows, schedule
    raise SystemExit(f"No regular-season stats found for {season} or {season - 1}")


def write_json(data: dict, path: Path, indent: int | None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    separators = None if indent else (",", ":")
    path.write_text(json.dumps(data, indent=indent, separators=separators) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", type=int, default=default_season(dt.date.today()))
    args = parser.parse_args()

    season, team_rows, player_rows, schedule = load_season(args.season)
    scores = final_scores(schedule, season)
    through_week, week_complete = week_status(team_rows, schedule, season)
    teams = build_team_rankings(team_rows, scores)
    if len(teams) != 32:
        raise SystemExit(f"Expected 32 teams, got {len(teams)}")
    players = build_players(player_rows, scores)

    meta = {"season": season, "throughWeek": through_week, "weekComplete": week_complete}
    write_json({**meta, "teams": teams}, TEAMS_JSON, indent=2)
    write_json({**meta, "players": players}, PLAYERS_JSON, indent=None)
    print(
        f"{season} through week {through_week}{'' if week_complete else ' (partial)'}: "
        f"wrote {len(teams)} teams to {TEAMS_JSON.relative_to(REPO_ROOT)} and "
        f"{len(players)} players to {PLAYERS_JSON.relative_to(REPO_ROOT)}"
    )


if __name__ == "__main__":
    main()
