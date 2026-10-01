import datetime as dt
import json

import pytest

from football_pipeline.fantasy import (
    PLAYERS_JSON,
    TEAMS_JSON,
    build_defenses,
    build_players,
    build_team_rankings,
    default_season,
    dst_fantasy_points,
    espn_dst_points,
    final_scores,
    kicker_fantasy_points,
    next_games,
    passing_fantasy_points,
    points_allowed_score,
    rushing_fantasy_points,
    week_status,
)
from football_pipeline.teams import TEAMS_JSON as APP_TEAMS_JSON

SCHEDULE = [
    {"game_id": "2026_01_LA_KC", "season": "2026", "game_type": "REG", "week": "1",
     "home_team": "KC", "home_score": "24", "away_team": "LA", "away_score": "17"},
    {"game_id": "2026_02_KC_BUF", "season": "2026", "game_type": "REG", "week": "2",
     "home_team": "BUF", "home_score": "", "away_team": "KC", "away_score": ""},
    {"game_id": "2025_22_KC_PHI", "season": "2025", "game_type": "SB", "week": "22",
     "home_team": "PHI", "home_score": "40", "away_team": "KC", "away_score": "22"},
]


def team_row(team, opponent, game_id="2026_01_LA_KC", **stats):
    return {"game_id": game_id, "season_type": "REG", "team": team, "opponent_team": opponent, **stats}


KC_ROW = team_row(
    "KC", "LA",
    passing_yards="250", passing_tds="2", passing_interceptions="1", passing_2pt_conversions="1",
    receptions="20", receiving_yards="250", receiving_tds="2", receiving_2pt_conversions="1",
    rushing_yards="100", rushing_tds="1", rushing_fumbles_lost="1",
    def_sacks="3.5", def_interceptions="1", fumble_recovery_opp="1", def_tds="1",
)
LA_ROW = team_row("LA", "KC", passing_yards="300", rushing_yards="50", rushing_tds="1")


def test_default_season_rolls_over_in_september():
    assert default_season(dt.date(2026, 9, 1)) == 2026
    assert default_season(dt.date(2027, 1, 12)) == 2026
    assert default_season(dt.date(2027, 8, 31)) == 2026


def test_final_scores_keeps_only_finished_regular_season_games():
    assert list(final_scores(SCHEDULE, 2026)) == ["2026_01_LA_KC"]


def test_offense_fantasy_points_match_ppr():
    assert rushing_fantasy_points(KC_ROW) == pytest.approx(10 + 6 - 2)
    # Passer: 10 yds + 8 TD - 2 INT + 2 2pt. Receivers: 20 rec + 25 yds + 12 TD + 2 2pt.
    assert passing_fantasy_points(KC_ROW) == pytest.approx(18 + 59)


@pytest.mark.parametrize(
    ("allowed", "score"),
    [(0, 10), (1, 7), (6, 7), (7, 4), (13, 4), (14, 1), (20, 1), (21, 0), (27, 0), (28, -1),
     (34, -1), (35, -4), (60, -4)],
)
def test_points_allowed_tiers(allowed, score):
    assert points_allowed_score(allowed) == score


def test_dst_fantasy_points():
    # 3.5 sacks + 2 INT + 2 fumble recovery + 6 TD + 1 for allowing 17.
    assert dst_fantasy_points(KC_ROW, 17) == pytest.approx(14.5)


@pytest.mark.parametrize(
    ("allowed", "yards", "score"),
    [(0, 99, 10), (1, 100, 7), (6, 199, 7), (7, 200, 5), (13, 299, 5), (14, 300, 1), (17, 349, 1),
     (18, 350, -1), (27, 399, -1), (28, 400, -4), (34, 449, -4), (35, 450, -8), (45, 499, -8),
     (46, 500, -11), (60, 549, -11), (60, 550, -12)],
)
def test_espn_dst_points_allowed_and_yards_allowed_tiers(allowed, yards, score):
    assert espn_dst_points({}, allowed, yards) == score


def test_defenses_use_espn_scoring_and_opponent_yards():
    # KC: 13.5 play points, 17 allowed (+1), LA gained 300 - 20 sack yards + 50 = 330 (0).
    # LA: nothing, 24 allowed (0), KC gained 250 + 100 = 350 (-1).
    la_row = {**LA_ROW, "sack_yards_lost": "20"}
    defenses = build_defenses([KC_ROW, la_row], final_scores(SCHEDULE, 2026))
    assert defenses == [
        {"team": "KC", "games": 1, "total": 14.5, "average": 14.5,
         "gameLog": [{"week": 1, "opponent": "LAR", "home": True, "points": 14.5}]},
        {"team": "LAR", "games": 1, "total": -1.0, "average": -1.0,
         "gameLog": [{"week": 1, "opponent": "KC", "home": False, "points": -1.0}]},
    ]


def test_team_rankings_are_per_game_and_map_rams():
    unfinished = team_row("KC", "BUF", game_id="2026_02_KC_BUF", passing_yards="999")
    teams = {t["abbr"]: t for t in build_team_rankings(
        [KC_ROW, LA_ROW, unfinished], final_scores(SCHEDULE, 2026)
    )}
    assert set(teams) == {"KC", "LAR"}

    kc = teams["KC"]
    assert kc["games"] == 1
    # (350 yards + 10 × 24 points), rushing (100 + 10 × 6), passing (250 + 10 × (12 + 2)).
    assert kc["offense"]["total"] == 590
    assert kc["offense"]["rush"] == 160
    assert kc["offense"]["pass"] == 390
    assert kc["defense"]["total"] == 14.5
    # KC's defense allowed the Rams' output: 5 + 6 rushing, 12 passing.
    assert kc["defense"]["rush"] == 11
    assert kc["defense"]["pass"] == 12
    assert teams["LAR"]["defense"]["rush"] == 14
    assert teams["LAR"]["defense"]["pointsAllowedPerGame"] == 24

    assert kc["gameLog"] == [{
        "week": 1, "opponent": "LAR", "home": True, "pointsFor": 24, "pointsAgainst": 17,
        "offense": {"total": 590, "rush": 160, "pass": 390},
        "defense": {"total": 14.5, "rush": 11, "pass": 12},
    }]
    assert teams["LAR"]["gameLog"][0]["home"] is False


def test_next_games_are_the_earliest_unplayed_games():
    schedule = [
        *SCHEDULE,
        {**SCHEDULE[1], "game_id": "2026_03_LA_KC", "week": "3", "home_team": "KC", "away_team": "LA"},
    ]
    assert next_games(schedule, 2026) == {
        "KC": {"week": 2, "opponent": "BUF", "home": False},
        "BUF": {"week": 2, "opponent": "KC", "home": True},
        "LAR": {"week": 3, "opponent": "KC", "home": False},
    }
    teams = build_team_rankings([KC_ROW, LA_ROW], final_scores(schedule, 2026), next_games(schedule, 2026))
    assert [t["nextGame"] for t in teams] == [
        {"week": 2, "opponent": "BUF", "home": False},
        {"week": 3, "opponent": "KC", "home": False},
    ]


def test_week_status_flags_unplayed_games():
    assert week_status([KC_ROW, LA_ROW], SCHEDULE, 2026) == (1, True)
    schedule = [*SCHEDULE, {**SCHEDULE[0], "game_id": "2026_01_NYG_DAL", "home_score": ""}]
    assert week_status([KC_ROW, LA_ROW], schedule, 2026) == (1, False)


def test_players_keep_fantasy_positions_and_latest_team():
    def row(week, team, opponent, points, position="WR", player_id="p1"):
        game_id = {"1": "2026_01_LA_KC", "2": "2026_02_KC_BUF"}[week]
        return {"player_id": player_id, "player_display_name": "Player", "position": position,
                "season_type": "REG", "week": week, "game_id": game_id, "team": team,
                "opponent_team": opponent, "fantasy_points_ppr": points}

    scores = {**final_scores(SCHEDULE, 2026), "2026_02_KC_BUF": SCHEDULE[1]}
    players = build_players(
        [row("2", "KC", "BUF", "5.5"), row("1", "LA", "KC", "10.25"),
         row("1", "LA", "KC", "8", position="LB", player_id="p2")],
        scores,
    )
    assert players == [{
        "id": "p1", "name": "Player", "position": "WR", "team": "KC",
        "games": 2, "total": 15.75, "average": 7.88,
        "gameLog": [
            {"week": 1, "opponent": "KC", "home": False, "points": 10.25},
            {"week": 2, "opponent": "BUF", "home": False, "points": 5.5},
        ],
    }]


def test_kicker_fantasy_points():
    row = {"pat_made": "3", "pat_missed": "1", "fg_made_20_29": "1", "fg_made_30_39": "1",
           "fg_made_40_49": "1", "fg_made_50_59": "1", "fg_missed": "2"}
    # 3 - 1 PAT, 3 + 3 + 4 + 5 FG, -2 missed FG.
    assert kicker_fantasy_points(row) == 15


def test_kickers_score_kicker_points():
    row = {"player_id": "k1", "player_display_name": "Kicker", "position": "K",
           "season_type": "REG", "week": "1", "game_id": "2026_01_LA_KC", "team": "KC",
           "opponent_team": "LA", "fantasy_points_ppr": "0", "pat_made": "3", "fg_made_40_49": "1"}
    [kicker] = build_players([row], final_scores(SCHEDULE, 2026))
    assert kicker["gameLog"] == [{"week": 1, "opponent": "LAR", "home": True, "points": 7}]


@pytest.fixture(scope="module")
def generated():
    return json.loads(TEAMS_JSON.read_text())


def test_generated_teams_cover_the_league(generated):
    app_abbrs = {t["abbr"] for t in json.loads(APP_TEAMS_JSON.read_text())}
    assert {t["abbr"] for t in generated["teams"]} == app_abbrs
    assert generated["throughWeek"] >= 1
    for team in generated["teams"]:
        assert 1 <= team["games"] <= generated["throughWeek"], team
        assert set(team["offense"]) >= {"total", "rush", "pass"}, team
        assert set(team["defense"]) >= {"total", "rush", "pass"}, team
        # Each season score is the average of the game log's scores.
        assert len(team["gameLog"]) == team["games"], team
        if team["nextGame"]:
            assert team["nextGame"]["week"] >= team["gameLog"][-1]["week"], team
        points_allowed = [g["pointsAgainst"] for g in team["gameLog"]]
        assert sum(points_allowed) / len(points_allowed) == pytest.approx(
            team["defense"]["pointsAllowedPerGame"], abs=0.051
        )
        for unit in ("offense", "defense"):
            for split in ("total", "rush", "pass"):
                scores = [g[unit][split] for g in team["gameLog"]]
                assert sum(scores) / len(scores) == pytest.approx(team[unit][split], abs=0.051)


def test_generated_players_match_season():
    players = json.loads(PLAYERS_JSON.read_text())
    assert players["season"] == json.loads(TEAMS_JSON.read_text())["season"]
    assert players["players"], "no players"
    assert {p["position"] for p in players["players"]} == {"QB", "RB", "WR", "TE", "K"}
    for p in players["players"]:
        assert len(p["gameLog"]) == p["games"], p
        assert p["average"] == pytest.approx(p["total"] / p["games"], abs=0.01), p
    assert len(players["defenses"]) == 32
    for d in players["defenses"]:
        assert len(d["gameLog"]) == d["games"], d
        assert d["total"] == pytest.approx(sum(g["points"] for g in d["gameLog"]), abs=0.01), d
