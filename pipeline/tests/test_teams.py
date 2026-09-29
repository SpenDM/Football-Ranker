import json
import re
from collections import Counter

import pytest

from football_pipeline.teams import LOGO_DIR, LOGO_OVERRIDES, TEAMS_JSON, parse_teams

HEX = re.compile(r"^#[0-9A-F]{6}$")

SAMPLE_CSV = """team_abbr,team_name,team_id,team_nick,team_conf,team_division,team_color,team_color2,team_logo_espn
SF,San Francisco 49ers,4500,49ers,NFC,NFC West,#AA0000,#b3995d,https://example.com/sf.png
STL,St. Louis Rams,2510,Rams,NFC,NFC West,#003594,#FFD100,https://example.com/stl.png
BUF,Buffalo Bills,0610,Bills,AFC,AFC East,#00338D,#C60C30,https://example.com/buf.png
BAL,Baltimore Ravens,0325,Ravens,AFC,AFC North,#241773,#9E7C0C,https://example.com/bal.png
"""


def test_parse_teams_filters_legacy_and_orders_by_division():
    teams = parse_teams(SAMPLE_CSV)
    assert [t["abbr"] for t in teams] == ["BAL", "BUF", "SF"]
    assert teams[2]["secondaryColor"] == "#B3995D"
    assert teams[2]["logo"] == "/logos/sf.png"


def test_parse_teams_uses_logo_overrides():
    csv_text = SAMPLE_CSV.replace("SF,San Francisco 49ers", "NYJ,New York Jets")
    nyj = next(t for t in parse_teams(csv_text) if t["abbr"] == "NYJ")
    assert nyj["logoSource"] == LOGO_OVERRIDES["NYJ"]


@pytest.fixture(scope="module")
def generated_teams():
    return json.loads(TEAMS_JSON.read_text())


def test_generated_has_32_teams_in_8_divisions_of_4(generated_teams):
    assert len(generated_teams) == 32
    assert len({t["abbr"] for t in generated_teams}) == 32
    divisions = Counter(t["division"] for t in generated_teams)
    assert len(divisions) == 8
    assert set(divisions.values()) == {4}


def test_generated_is_in_canonical_division_order(generated_teams):
    order = list(dict.fromkeys(t["division"] for t in generated_teams))
    assert order == [
        "AFC North", "AFC East", "AFC South", "AFC West",
        "NFC North", "NFC East", "NFC South", "NFC West",
    ]


def test_generated_colors_and_logos(generated_teams):
    for team in generated_teams:
        assert HEX.match(team["primaryColor"]), team
        assert HEX.match(team["secondaryColor"]), team
        path, _, version = team["logo"].partition("?v=")
        assert (LOGO_DIR / path.removeprefix("/logos/")).is_file(), team
        assert re.fullmatch(r"[0-9a-f]{8}", version), team
