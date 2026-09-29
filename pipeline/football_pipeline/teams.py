"""Build the NFL team dataset (teams.json + logos) consumed by the web app.

Usage: python -m football_pipeline.teams [--skip-logos]
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
from pathlib import Path

import requests

SOURCE_URL = "https://github.com/nflverse/nflfastR-data/raw/master/teams_colors_logos.csv"

REPO_ROOT = Path(__file__).resolve().parents[2]
TEAMS_JSON = REPO_ROOT / "web" / "src" / "lib" / "data" / "teams.json"
LOGO_DIR = REPO_ROOT / "web" / "static" / "logos"

# nflverse keeps rows for relocated franchises and a duplicate Rams row ("LA").
LEGACY_ABBRS = {"LA", "OAK", "SD", "STL"}

# ESPN's default logos for these teams are hard to see on their own team-color backgrounds;
# use the primary logos drawn for a primary-color background (yellow LA, white JETS and ny)
# instead. The app draws these without the light glow it adds behind other logos.
# (The originals are 4096px; ESPN's image combiner serves them at the default logos' 500px.)
ESPN_LOGOS = (
    "https://a.espncdn.com/combiner/i"
    "?img=/guid/{guid}/logos/primary_logo_on_primary_color.png&w=500&h=500"
)
LOGO_OVERRIDES = {
    "LAR": ESPN_LOGOS.format(guid="2e1473b2-e269-fd7a-1137-c1edacb85986"),
    "NYJ": ESPN_LOGOS.format(guid="732d3caf-b350-1e34-48c6-b7cebb4a0d88"),
    "NYG": ESPN_LOGOS.format(guid="378600ea-2397-8364-8399-b7c1606a49a7"),
}

CONFERENCE_ORDER = ["AFC", "NFC"]
DIVISION_ORDER = ["North", "East", "South", "West"]


def fetch_csv(url: str = SOURCE_URL) -> str:
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def division_sort_key(division: str) -> tuple[int, int]:
    conference, direction = division.split(" ")
    return CONFERENCE_ORDER.index(conference), DIVISION_ORDER.index(direction)


def parse_teams(csv_text: str) -> list[dict]:
    """Convert the nflverse CSV into app team records, in canonical division order."""
    teams = []
    for row in csv.DictReader(io.StringIO(csv_text)):
        abbr = row["team_abbr"]
        if abbr in LEGACY_ABBRS:
            continue
        teams.append(
            {
                "abbr": abbr,
                "name": row["team_name"],
                "nickname": row["team_nick"],
                "conference": row["team_conf"],
                "division": row["team_division"],
                "primaryColor": row["team_color"].upper(),
                "secondaryColor": row["team_color2"].upper(),
                "logo": f"/logos/{abbr.lower()}.png",
                "logoOnColor": abbr in LOGO_OVERRIDES,
                "logoSource": LOGO_OVERRIDES.get(abbr, row["team_logo_espn"]),
            }
        )
    teams.sort(key=lambda t: (division_sort_key(t["division"]), t["name"]))
    return teams


def download_logos(teams: list[dict], logo_dir: Path = LOGO_DIR) -> None:
    logo_dir.mkdir(parents=True, exist_ok=True)
    for team in teams:
        dest = logo_dir / Path(team["logo"]).name
        resp = requests.get(team["logoSource"], timeout=30)
        resp.raise_for_status()
        dest.write_bytes(resp.content)


def versioned_logo(logo: str, logo_dir: Path = LOGO_DIR) -> str:
    """Add a hash of the logo file to its URL, so browsers refetch a logo when it changes
    (logos are cached for a week; see web/static/_headers)."""
    digest = hashlib.sha256((logo_dir / Path(logo).name).read_bytes()).hexdigest()[:8]
    return f"{logo}?v={digest}"


def write_teams(teams: list[dict], path: Path = TEAMS_JSON) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    public = [
        {**{k: v for k, v in t.items() if k != "logoSource"}, "logo": versioned_logo(t["logo"])}
        for t in teams
    ]
    path.write_text(json.dumps(public, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-logos", action="store_true", help="only regenerate teams.json")
    args = parser.parse_args()

    teams = parse_teams(fetch_csv())
    if len(teams) != 32:
        raise SystemExit(f"Expected 32 teams, got {len(teams)}")
    if not args.skip_logos:
        download_logos(teams)
    write_teams(teams)
    print(f"Wrote {len(teams)} teams to {TEAMS_JSON.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
