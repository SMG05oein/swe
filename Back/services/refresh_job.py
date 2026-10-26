# -*- coding: utf-8 -*-
"""Public-data refresh job status and local cache snapshot."""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE_PATH = DATA_DIR / "public_data_cache.json"
STATUS_PATH = DATA_DIR / "refresh_status.json"

_lock = threading.Lock()
_timer: Optional[threading.Timer] = None

_status: dict[str, Any] = {
    "running": False,
    "lastSuccessAt": None,
    "lastError": None,
    "lastTriggeredBy": None,
    "intervalHours": 24,
    "message": "대기 중",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")


def load_status() -> dict[str, Any]:
    global _status
    if STATUS_PATH.exists():
        try:
            with STATUS_PATH.open("r", encoding="utf-8") as f:
                disk = json.load(f)
            _status = {**_status, **disk}
        except Exception:
            pass
    return dict(_status)


def save_status() -> dict[str, Any]:
    _write_json(STATUS_PATH, _status)
    return dict(_status)


def load_cache() -> Optional[dict[str, Any]]:
    if not CACHE_PATH.exists():
        return None
    try:
        with CACHE_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def run_refresh(triggered_by: str = "manual", snapshot: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Mark refresh and persist optional frontend-supplied snapshot.

    Full portal scraping stays on the Vite-proxied client; this job records
    status and stores a server-side cache copy when provided.
    """
    with _lock:
        _status["running"] = True
        _status["lastTriggeredBy"] = triggered_by
        _status["message"] = "갱신 중"
        save_status()

    try:
        payload = snapshot or {
            "updatedAt": _now_iso(),
            "note": "서버 캐시 스냅샷 (클라이언트 수집 데이터 업로드 또는 플레이스홀더)",
            "accidents": {},
            "facilities": {},
        }
        if "updatedAt" not in payload:
            payload["updatedAt"] = _now_iso()
        _write_json(CACHE_PATH, payload)

        with _lock:
            _status["running"] = False
            _status["lastSuccessAt"] = _now_iso()
            _status["lastError"] = None
            _status["message"] = "갱신 완료"
            save_status()
    except Exception as exc:
        with _lock:
            _status["running"] = False
            _status["lastError"] = str(exc)
            _status["message"] = "갱신 실패"
            save_status()
        raise

    return load_status()


def schedule_periodic(interval_hours: int, runner) -> None:
    """Restart daemon timer that periodically calls runner()."""
    global _timer
    with _lock:
        _status["intervalHours"] = interval_hours
        save_status()
        if _timer is not None:
            _timer.cancel()
            _timer = None

        if interval_hours <= 0:
            return

        def _tick():
            try:
                runner()
            finally:
                schedule_periodic(interval_hours, runner)

        _timer = threading.Timer(interval_hours * 3600, _tick)
        _timer.daemon = True
        _timer.start()
