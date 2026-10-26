# -*- coding: utf-8 -*-
"""Persist checklist / grade configuration as JSON."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CONFIG_PATH = DATA_DIR / "checklist_config.json"

DEFAULT_CONFIG: dict[str, Any] = {
    "items": [
        {"id": "cctv", "label": "CCTV", "weight": 25, "facilityKey": "cctv"},
        {"id": "speed_bump", "label": "과속방지턱", "weight": 25, "facilityKey": "speedBump"},
        {"id": "ped_light", "label": "보행신호등", "weight": 25, "facilityKey": "pedestrianLight"},
        {"id": "countdown", "label": "잔여시간표시기", "weight": 25, "facilityKey": "countdown"},
    ],
    "passThreshold": 60,
    "routeGrade": {"safeMax": 0, "cautionMax": 2},
    "corridorMeters": 80,
    "refreshIntervalHours": 24,
}


def ensure_defaults() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CONFIG_PATH.exists():
        save_config(DEFAULT_CONFIG)


def load_config() -> dict[str, Any]:
    ensure_defaults()
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        merged = {**DEFAULT_CONFIG, **data}
        return merged
    except Exception:
        return dict(DEFAULT_CONFIG)


def save_config(config: dict[str, Any]) -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    merged = {**DEFAULT_CONFIG, **config}
    with CONFIG_PATH.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return merged
