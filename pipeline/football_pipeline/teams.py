"""Build the NFL team dataset (teams.json + logos) consumed by the web app.

Usage: python -m football_pipeline.teams [--skip-logos]
"""

from __future__ import annotations

import argparse
import csv
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
                "logoSource": row["team_logo_espn"],
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


def write_teams(teams: list[dict], path: Path = TEAMS_JSON) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    public = [{k: v for k, v in t.items() if k != "logoSource"} for t in teams]
    path.write_text(json.dumps(public, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-logos", action="store_true", help="only regenerate teams.json")
    args = parser.parse_args()

    teams = parse_teams(fetch_csv())
    if len(teams) != 32:
        raise SystemExit(f"Expected 32 teams, got {len(teams)}")
    write_teams(teams)
    if not args.skip_logos:
        download_logos(teams)
    print(f"Wrote {len(teams)} teams to {TEAMS_JSON.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
