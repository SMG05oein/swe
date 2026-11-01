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
    "personas": {
        "child": {
            "name": "어린이 보호자",
            "activeIteration": 5,
            "iterations": [
                {
                    "iteration": 1,
                    "title": "기초 시설 점검",
                    "passThreshold": 60,
                    "items": [
                        {"id": "cctv", "label": "CCTV", "weight": 25, "facilityKey": "cctv"},
                        {"id": "speed_bump", "label": "과속방지턱", "weight": 25, "facilityKey": "speedBump"},
                        {"id": "ped_light", "label": "보행신호등", "weight": 25, "facilityKey": "pedestrianLight"},
                        {"id": "countdown", "label": "잔여시간표시기", "weight": 25, "facilityKey": "countdown"},
                    ],
                },
                {
                    "iteration": 2,
                    "title": "방호 및 인지 시설 도입",
                    "passThreshold": 70,
                    "items": [
                        {"id": "safety_fence", "label": "방호울타리", "weight": 25, "facilityKey": "safetyFence"},
                        {"id": "yellow_carpet", "label": "옐로카펫", "weight": 20, "facilityKey": "yellowCarpet"},
                        {"id": "cctv", "label": "CCTV", "weight": 20, "facilityKey": "cctv"},
                        {"id": "ped_light", "label": "보행신호등", "weight": 20, "facilityKey": "pedestrianLight"},
                        {"id": "speed_bump", "label": "과속방지턱", "weight": 15, "facilityKey": "speedBump"},
                    ],
                },
                {
                    "iteration": 3,
                    "title": "스쿨존 규제 및 시간대 사고 연동",
                    "passThreshold": 70,
                    "items": [
                        {"id": "school_cam", "label": "스쿨존 단속카메라", "weight": 25, "facilityKey": "schoolZoneCamera"},
                        {"id": "safety_fence", "label": "방호울타리", "weight": 25, "facilityKey": "safetyFence"},
                        {"id": "yellow_carpet", "label": "옐로카펫", "weight": 20, "facilityKey": "yellowCarpet"},
                        {"id": "speed_bump", "label": "과속방지턱", "weight": 15, "facilityKey": "speedBump"},
                        {"id": "countdown", "label": "잔여시간표시기", "weight": 15, "facilityKey": "countdown"},
                    ],
                },
                {
                    "iteration": 4,
                    "title": "보행 공간 기하구조 및 시야 평가",
                    "passThreshold": 75,
                    "items": [
                        {"id": "safety_fence", "label": "보차분리 방호울타리", "weight": 25, "facilityKey": "safetyFence"},
                        {"id": "school_cam", "label": "불법주정차 단속CCTV", "weight": 20, "facilityKey": "schoolZoneCamera"},
                        {"id": "yellow_carpet", "label": "시야유도 옐로카펫", "weight": 20, "facilityKey": "yellowCarpet"},
                        {"id": "ped_light", "label": "보행신호체계", "weight": 20, "facilityKey": "pedestrianLight"},
                        {"id": "speed_bump", "label": "진입감속 과속방지턱", "weight": 15, "facilityKey": "speedBump"},
                    ],
                },
                {
                    "iteration": 5,
                    "title": "통합 어린이 보행안전 스코어카드(C-Safety)",
                    "passThreshold": 80,
                    "items": [
                        {"id": "safety_fence", "label": "보차분리 방호울타리", "weight": 25, "facilityKey": "safetyFence"},
                        {"id": "school_cam", "label": "스쿨존 무인단속카메라", "weight": 20, "facilityKey": "schoolZoneCamera"},
                        {"id": "yellow_carpet", "label": "옐로카펫·노란횡단보도", "weight": 20, "facilityKey": "yellowCarpet"},
                        {"id": "floor_light", "label": "바닥형 스마트신호등", "weight": 20, "facilityKey": "floorLight"},
                        {"id": "countdown", "label": "보행신호 잔여시간표시기", "weight": 15, "facilityKey": "countdown"},
                    ],
                },
            ],
        },
        "elder": {
            "name": "어르신 보호자",
            "activeIteration": 5,
            "iterations": [
                {
                    "iteration": 1,
                    "title": "기초 시설 점검",
                    "passThreshold": 60,
                    "items": [
                        {"id": "cctv", "label": "CCTV", "weight": 25, "facilityKey": "cctv"},
                        {"id": "speed_bump", "label": "과속방지턱", "weight": 25, "facilityKey": "speedBump"},
                        {"id": "ped_light", "label": "보행신호등", "weight": 25, "facilityKey": "pedestrianLight"},
                        {"id": "countdown", "label": "잔여시간표시기", "weight": 25, "facilityKey": "countdown"},
                    ],
                },
                {
                    "iteration": 2,
                    "title": "보행 속도 적정성 및 신호 인지 도입",
                    "passThreshold": 65,
                    "items": [
                        {"id": "countdown", "label": "잔여시간표시기(신호적정)", "weight": 30, "facilityKey": "countdown"},
                        {"id": "acoustic_signal", "label": "보행음향신호기", "weight": 20, "facilityKey": "acousticSignal"},
                        {"id": "floor_light", "label": "바닥형 보행신호등", "weight": 20, "facilityKey": "floorLight"},
                        {"id": "ped_light", "label": "보행신호등", "weight": 15, "facilityKey": "pedestrianLight"},
                        {"id": "speed_bump", "label": "과속방지턱", "weight": 15, "facilityKey": "speedBump"},
                    ],
                },
                {
                    "iteration": 3,
                    "title": "무장애 수평 이동 및 경사도·단차 평가",
                    "passThreshold": 70,
                    "items": [
                        {"id": "barrier_free", "label": "보도 턱낮춤·무장애보행로", "weight": 30, "facilityKey": "barrierFree"},
                        {"id": "countdown", "label": "보행잔여시간표시기", "weight": 25, "facilityKey": "countdown"},
                        {"id": "floor_light", "label": "바닥형 보행신호등", "weight": 20, "facilityKey": "floorLight"},
                        {"id": "acoustic_signal", "label": "음향신호기", "weight": 15, "facilityKey": "acousticSignal"},
                        {"id": "speed_bump", "label": "과속방지턱", "weight": 10, "facilityKey": "speedBump"},
                    ],
                },
                {
                    "iteration": 4,
                    "title": "고령자 활동 거점 및 무단횡단 취약지 연동",
                    "passThreshold": 70,
                    "items": [
                        {"id": "barrier_free", "label": "무장애 턱낮춤 보행로", "weight": 25, "facilityKey": "barrierFree"},
                        {"id": "safety_fence", "label": "무단횡단 방지펜스", "weight": 25, "facilityKey": "safetyFence"},
                        {"id": "countdown", "label": "잔여시간표시기", "weight": 20, "facilityKey": "countdown"},
                        {"id": "floor_light", "label": "바닥형 신호등", "weight": 15, "facilityKey": "floorLight"},
                        {"id": "acoustic_signal", "label": "음향신호기", "weight": 15, "facilityKey": "acousticSignal"},
                    ],
                },
                {
                    "iteration": 5,
                    "title": "통합 어르신 무장애 안심 스코어카드(S-Safety)",
                    "passThreshold": 75,
                    "items": [
                        {"id": "barrier_free", "label": "무장애 보도 턱낮춤·단차제거", "weight": 25, "facilityKey": "barrierFree"},
                        {"id": "smart_shelter", "label": "스마트 쉼터·폭염한파대피소", "weight": 20, "facilityKey": "smartShelter"},
                        {"id": "floor_light", "label": "바닥형 보행신호등", "weight": 20, "facilityKey": "floorLight"},
                        {"id": "acoustic_signal", "label": "시각·노인 음향신호기", "weight": 20, "facilityKey": "acousticSignal"},
                        {"id": "countdown", "label": "보행 여유 잔여시간표시기", "weight": 15, "facilityKey": "countdown"},
                    ],
                },
            ],
        },
        "admin": {
            "name": "교통안전 관리자",
            "activeIteration": 5,
            "iterations": [
                {
                    "iteration": 1,
                    "title": "기초 시설 단순 집계",
                    "passThreshold": 60,
                    "items": [
                        {"id": "cctv", "label": "CCTV", "weight": 25, "facilityKey": "cctv"},
                        {"id": "speed_bump", "label": "과속방지턱", "weight": 25, "facilityKey": "speedBump"},
                        {"id": "ped_light", "label": "보행신호등", "weight": 25, "facilityKey": "pedestrianLight"},
                        {"id": "countdown", "label": "잔여시간표시기", "weight": 25, "facilityKey": "countdown"},
                    ],
                },
                {
                    "iteration": 2,
                    "title": "법정 보호구역 안전설비 충족률",
                    "passThreshold": 75,
                    "items": [
                        {"id": "safety_fence", "label": "법정 방호울타리", "weight": 25, "facilityKey": "safetyFence"},
                        {"id": "school_cam", "label": "무인단속CCTV", "weight": 25, "facilityKey": "schoolZoneCamera"},
                        {"id": "speed_bump", "label": "고원식 과속방지턱", "weight": 20, "facilityKey": "speedBump"},
                        {"id": "ped_light", "label": "보행신호등", "weight": 15, "facilityKey": "pedestrianLight"},
                        {"id": "yellow_carpet", "label": "옐로카펫", "weight": 15, "facilityKey": "yellowCarpet"},
                    ],
                },
                {
                    "iteration": 3,
                    "title": "사고심각도(EPDO) 및 결측 인과 분석",
                    "passThreshold": 80,
                    "items": [
                        {"id": "school_cam", "label": "사고다발 단속카메라", "weight": 25, "facilityKey": "schoolZoneCamera"},
                        {"id": "safety_fence", "label": "사상사고 차단울타리", "weight": 25, "facilityKey": "safetyFence"},
                        {"id": "speed_bump", "label": "제동유도 방지턱", "weight": 20, "facilityKey": "speedBump"},
                        {"id": "floor_light", "label": "스마트 바닥신호등", "weight": 15, "facilityKey": "floorLight"},
                        {"id": "barrier_free", "label": "보행 연속성(턱낮춤)", "weight": 15, "facilityKey": "barrierFree"},
                    ],
                },
                {
                    "iteration": 4,
                    "title": "예산 대비 사고감소 B/C 및 투자 우선순위",
                    "passThreshold": 80,
                    "items": [
                        {"id": "school_cam", "label": "고위험 무인단속카메라", "weight": 25, "facilityKey": "schoolZoneCamera"},
                        {"id": "safety_fence", "label": "방호울타리 확충", "weight": 25, "facilityKey": "safetyFence"},
                        {"id": "floor_light", "label": "스마트 횡단보도 바닥등", "weight": 20, "facilityKey": "floorLight"},
                        {"id": "barrier_free", "label": "무장애 보도 정비", "weight": 15, "facilityKey": "barrierFree"},
                        {"id": "smart_shelter", "label": "폭염그늘막·쉼터", "weight": 15, "facilityKey": "smartShelter"},
                    ],
                },
                {
                    "iteration": 5,
                    "title": "통합 스마트 거버넌스(M-Safety)",
                    "passThreshold": 85,
                    "items": [
                        {"id": "school_cam", "label": "스마트 단속 및 시민민원연계", "weight": 25, "facilityKey": "schoolZoneCamera"},
                        {"id": "safety_fence", "label": "보행로 방호울타리", "weight": 20, "facilityKey": "safetyFence"},
                        {"id": "floor_light", "label": "바닥형 스마트신호등", "weight": 20, "facilityKey": "floorLight"},
                        {"id": "barrier_free", "label": "무장애 단차정비", "weight": 20, "facilityKey": "barrierFree"},
                        {"id": "smart_shelter", "label": "스마트 안심쉼터", "weight": 15, "facilityKey": "smartShelter"},
                    ],
                },
            ],
        },
    },
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
