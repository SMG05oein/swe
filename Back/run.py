#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
천안시 교통약자 보행경로 안전 - FastAPI 백엔드
경로 유의점(AI)과 관리자 설정/갱신을 제공한다.
"""
from __future__ import annotations

import os
import json
import re
import httpx
from typing import Any, List, Optional
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services import config_store, refresh_job

app = FastAPI(
    title="천안시 교통약자 보행경로 안전 API",
    version="2.0.0",
    description="보호자 경로 안전 분석 및 관리자 설정/갱신 백엔드",
)

# 로컬 개발 및 도커 컨테이너 배포 환경을 위한 CORS 교차 출처 리소스 공유 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 환경 변수 기반 설정값 로드
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "cheonan-safety")
FALLBACK_MODEL = os.environ.get("FALLBACK_MODEL", "qwen2.5:7b")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "change-me-admin-token")

# 동일 지점 반복 조회 시 지연 시간을 없애기 위한 인메모리 캐시 딕셔너리
cache = {}

config_store.ensure_defaults()
refresh_job.load_status()


def require_admin(token: Optional[str]) -> None:
    if not token or token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="관리자 토큰이 올바르지 않습니다.")


class DiagnosisRequest(BaseModel):
    spot_nm: str = Field(..., description="교통사고 다발 지점명")
    district: Optional[str] = Field("천안시", description="관할 구역 (천안시 동남구 또는 서북구)")
    category: Optional[str] = Field("child", description="사고 유형 분류 (child, elder, violation)")
    year: Optional[str] = Field("2023", description="통계 공표 연도")
    casualties: Optional[int] = Field(0, description="총 사상자 수")
    deaths: Optional[int] = Field(0, description="사망자 수")
    serious: Optional[int] = Field(0, description="중상자 수")
    minor: Optional[int] = Field(0, description="경상 및 부상신고자 수")
    road_shape: Optional[str] = Field("일반 교차로", description="도로 형태")
    deficit_score: Optional[int] = Field(60, description="5대 안전시설 결측 점수 (0~100점)")
    cctv_count: Optional[int] = Field(0, description="반경 300m 단속·방범 CCTV 대수")
    bump_count: Optional[int] = Field(0, description="반경 300m 과속방지턱 수량")
    ped_light_count: Optional[int] = Field(0, description="보행신호등 수량")
    countdown_count: Optional[int] = Field(0, description="잔여시간표시기 수량")
    has_zone: Optional[bool] = Field(False, description="어린이 또는 노인보호구역 연계 여부")


class DiagnosisResponse(BaseModel):
    risk_level: str
    comprehensive_diagnosis: str
    driver_rules: List[str]
    pedestrian_rules: List[str]
    infrastructure_recommendations: List[str]
    source: str = Field("ollama_ai", description="결과 출처: ollama_ai 또는 rule_fallback")


def build_rule_fallback(req: DiagnosisRequest) -> DiagnosisResponse:
    """올라마 미기동 또는 응답 지연 시 즉시 작동하는 규칙 기반 안전 폴백 진단 함수"""
    deaths = req.deaths or 0
    serious = req.serious or 0
    casualties = req.casualties or (deaths + serious + (req.minor or 0))
    severe_count = deaths + serious
    severe_rate = round((severe_count / casualties) * 100) if casualties > 0 else 0

    # 사상자 규모 및 치명률 기반 위험 등급 판정
    if deaths > 0 or severe_rate >= 50 or casualties >= 4:
        risk_level = "심각 위험"
    elif casualties >= 2 or severe_rate >= 25:
        risk_level = "경고 등급"
    else:
        risk_level = "주의"

    has_ped = (req.ped_light_count or 0) > 0
    has_count = (req.countdown_count or 0) > 0
    has_bump = (req.bump_count or 0) > 0
    has_cctv = (req.cctv_count or 0) > 0

    # 구조적 사고 원인 진단 구성
    diag_parts = []
    if deaths > 0:
        diag_parts.append(f"해당 지점은 사망 사고가 발생한 고위험 구간으로 중상 이상 치명률이 {severe_rate}%에 달합니다.")
    elif severe_rate >= 40:
        diag_parts.append(f"사상자 대비 중상 이상 비율이 {severe_rate}%로 집중되어 있어 대형 인명 피해 위험이 높습니다.")
    else:
        diag_parts.append(f"사고 통계 분석 결과 지속적인 보행 사고가 누적되는 주의 구역입니다.")

    if not has_count and has_ped:
        diag_parts.append("보행신호 잔여시간표시기가 결측되어 있어 보행약자가 신호 마감 시점 딜레마존에 노출되기 쉽습니다.")
    elif not has_ped:
        diag_parts.append("보행신호등이 결측되어 있어 횡단 시 운전자 감속 유도와 시야 확보가 매우 취약합니다.")

    if not has_bump:
        diag_parts.append("감속용 과속방지턱이 부족하여 진입 차량의 감속 효과가 제한적입니다.")

    # 운전자 맞춤 행동 수칙 도출
    driver_rules = []
    if req.category == "elder":
        driver_rules.append("어르신 보행자는 횡단 속도가 느리므로 완전히 인도에 오를 때까지 횡단보도 정지선에서 대기하십시오.")
        driver_rules.append("교차로 우회전 진입 시 A필러 사각지대에 보행자가 있는지 반드시 2회 이상 확인하십시오.")
    elif req.category == "child" or req.has_zone:
        driver_rules.append("어린이보호구역 시속 30km 제한속도를 준수하고 횡단보도 앞에서는 무조건 일시정지하십시오.")
        driver_rules.append("주정차 차량 사이에서 어린이가 갑자기 튀어나올 것에 대비해 브레이크에 발을 올려두십시오.")
    else:
        driver_rules.append("교차로 진입 시 황색 신호 무리한 진입을 삼가고 정지선을 엄수하십시오.")
        driver_rules.append("야간 및 조명 취약 구간 주행 시 전방 주시를 철저히 하고 감속 운행하십시오.")

    # 보행약자 맞춤 행동 수칙 도출
    ped_rules = []
    if not has_count:
        ped_rules.append("신호 잔여시간표시기가 없으므로 녹색 신호가 깜빡일 때는 무리하게 건너지 말고 다음 신호를 대기하십시오.")
    else:
        ped_rules.append("잔여 시간이 10초 이하일 때는 진입을 멈추고 안전선 안쪽에서 대기하십시오.")

    if req.category == "elder":
        ped_rules.append("야간 및 우천 시 운전자가 쉽게 인지할 수 있도록 밝은 색상의 옷이나 반사용품을 착용하십시오.")
    else:
        ped_rules.append("횡단보도를 건널 때는 절대 뛰지 말고 좌우 차량이 완전히 멈춘 것을 확인한 후 건너십시오.")

    # 천안시 도로교통과 맞춤 시설 개선 제언 도출
    infra_recs = []
    if not has_count:
        infra_recs.append("보행신호 잔여시간표시기 즉시 신설 및 보행신호 시간 3~5초 연장")
    if not has_bump:
        infra_recs.append("횡단보도 전방 30m 지점 고원식 과속방지턱 2개소 신설")
    if not has_cctv:
        infra_recs.append("시야 사각지대 해소를 위한 천안시 스마트 불법주정차 단속CCTV 1대 추가 확충")
    if "교차로" in req.road_shape:
        infra_recs.append("야간 보행자 투광기 증설 및 바닥형 보행신호등(스마트 횡단보도) 도입")

    if len(infra_recs) < 2:
        infra_recs.append("보차분리용 안전펜스 설치 및 활주로형 도로표지병 구축")

    return DiagnosisResponse(
        risk_level=risk_level,
        comprehensive_diagnosis=" ".join(diag_parts),
        driver_rules=driver_rules[:2],
        pedestrian_rules=ped_rules[:2],
        infrastructure_recommendations=infra_recs[:3],
        source="rule_fallback",
    )


def extract_json_from_llm(raw_text: str) -> Optional[dict]:
    """LLM 생성 텍스트에서 안전하게 순수 JSON 객체를 추출하고 파싱하는 함수"""
    if not raw_text:
        return None

    # 1차 시도: 직접 JSON 파싱
    try:
        return json.loads(raw_text.strip())
    except Exception:
        pass

    # 2차 시도: 마크다운 코드블록(```json) 정규식 제거 후 파싱
    code_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
    if code_match:
        try:
            return json.loads(code_match.group(1).strip())
        except Exception:
            pass

    # 3차 시도: 본문 내 최초 중괄호 블록 추출 파싱
    brace_match = re.search(r"(\{[\s\S]*\})", raw_text)
    if brace_match:
        try:
            return json.loads(brace_match.group(1).strip())
        except Exception:
            pass

    # 4차 시도: 불완전 종료된 JSON 자동 보정 (닫는 따옴표, 괄호 자동 마감)
    if "{" in raw_text:
        start_idx = raw_text.find("{")
        snippet = raw_text[start_idx:].strip()
        # 끝부분이 따옴표나 쉼표 등 불완전한 상태일 때 닫는 괄호 순차 시도
        candidates = [
            snippet + "}",
            snippet + "\"]}",
            snippet + "\"}]}",
            snippet + "\"]\n}",
            snippet + "\"\n]}",
        ]
        for cand in candidates:
            try:
                return json.loads(cand)
            except Exception:
                continue

    return None


@app.get("/")
def root():
    """서버 기본 상태 확인 엔드포인트"""
    return {
        "status": "online",
        "service": "천안시 교통약자 안전 인텔리전스 백엔드",
        "ollama_host": OLLAMA_HOST,
        "default_model": OLLAMA_MODEL,
    }


@app.get("/api/health")
async def health_check():
    """올라마 연결 상태 및 가용 모델 목록 점검 헬스체크 엔드포인트"""
    ollama_online = False
    models_available = []
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{OLLAMA_HOST}/api/tags")
            if resp.status_code == 200:
                ollama_online = True
                models_available = [m.get("name") for m in resp.json().get("models", [])]
    except Exception:
        pass

    return {
        "status": "healthy",
        "ollama_connected": ollama_online,
        "ollama_host": OLLAMA_HOST,
        "available_models": models_available,
        "active_target_model": OLLAMA_MODEL,
        "cached_queries_count": len(cache),
    }


@app.post("/api/diagnose", response_model=DiagnosisResponse)
async def diagnose_spot(req: DiagnosisRequest):
    """다발 지점별 AI 정밀 진단 및 안전 수칙 반환 핵심 엔드포인트"""
    cache_key = f"{req.spot_nm}_{req.year}_{req.category}_{req.deficit_score}"
    if cache_key in cache:
        return cache[cache_key]

    deaths = req.deaths or 0
    serious = req.serious or 0
    casualties = req.casualties or (deaths + serious + (req.minor or 0))
    severe_rate = round(((deaths + serious) / casualties) * 100) if casualties > 0 else 0

    target_name = (
        "보행 노인 교통사고 다발지역"
        if req.category == "elder"
        else "어린이보호구역 내 교통사고 다발지역"
        if req.category == "child"
        else "법규위반 다발지역"
    )

    prompt = (
        f"지점명: {req.spot_nm}\n"
        f"권역: {req.district}\n"
        f"사고유형: {target_name}\n"
        f"사고통계: 총 사고 {casualties}명 대상 (사망 {deaths}명, 중상 {serious}명, 경상 {req.minor or 0}명, 치명률 {severe_rate}%)\n"
        f"도로형태: {req.road_shape}\n"
        f"보호구역 연계: {'보호구역 지정구간' if req.has_zone else '일반 도로구간'}\n"
        f"주변 5대 시설물 실측 현황 (반경 300m): 단속CCTV {req.cctv_count or 0}대, "
        f"과속방지턱 {req.bump_count or 0}개, 보행신호등 {req.ped_light_count or 0}개, "
        f"잔여시간표시기 {req.countdown_count or 0}개, 결측 점수 {req.deficit_score}점"
    )

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "당신은 도로교통공단 및 천안시 교통안전 전문 진단 AI 어드바이저입니다. "
                    "교통사고 다발 지점의 실측 사상자 규모와 반경 300m 내 안전시설 결측 데이터를 종합 분석하여 "
                    "위험도 등급, 구조적 원인 진단, 운전자 및 보행약자 맞춤 행동 수칙, 천안시 맞춤 인프라 개선안을 엄격한 JSON 규격으로 반환하십시오."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.2, "top_p": 0.85, "num_predict": 450},
    }

    # 올라마 비동기 호출 시도 (로컬 GPU/CPU 추론 시간 고려 90초 대기)
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(f"{OLLAMA_HOST}/api/chat", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("message", {}).get("content", "")
                print(f"[OLLAMA_AI_RESPONSE] {content}")
                parsed = extract_json_from_llm(content)
                if parsed and "comprehensive_diagnosis" in parsed:
                    # 문장이 중간에 잘려 끝나는 경우 대비 자연스러운 마침표 및 종결 처리
                    def clean_rules(rule_list, fallback_list):
                        cleaned = []
                        for r in rule_list:
                            if not r or len(r.strip()) < 5:
                                continue
                            text = r.strip()
                            if not text.endswith((".", "!", "요", "다", "오")):
                                text += " 확인 후 주의하여 보행하십시오."
                            cleaned.append(text)
                        return (cleaned + fallback_list)[:2]

                    rule_fb = build_rule_fallback(req)
                    d_rules = clean_rules(parsed.get("driver_rules", []), rule_fb.driver_rules)
                    p_rules = clean_rules(parsed.get("pedestrian_rules", []), rule_fb.pedestrian_rules)
                    infra_recs = parsed.get("infrastructure_recommendations", [])
                    if not infra_recs or len(infra_recs) == 0:
                        infra_recs = rule_fb.infrastructure_recommendations

                    result = DiagnosisResponse(
                        risk_level=parsed.get("risk_level", "경고 등급"),
                        comprehensive_diagnosis=parsed.get("comprehensive_diagnosis", rule_fb.comprehensive_diagnosis),
                        driver_rules=d_rules,
                        pedestrian_rules=p_rules,
                        infrastructure_recommendations=infra_recs[:3],
                        source="ollama_ai",
                    )
                    cache[cache_key] = result
                    return result
    except Exception:
        # 올라마 미기동 또는 타임아웃 발생 시 무장애 자동 폴백 전환
        pass

    # 규칙 기반 고품질 폴백 결과 반환
    fallback_result = build_rule_fallback(req)
    cache[cache_key] = fallback_result
    return fallback_result


@app.post("/api/cache/clear")
def clear_cache(x_admin_token: Optional[str] = Header(default=None)):
    """인메모리 진단 캐시 초기화 (관리자 전용)"""
    require_admin(x_admin_token)
    cache.clear()
    return {"status": "success", "message": "캐시가 성공적으로 초기화되었습니다."}


class TipsRequest(BaseModel):
    spot_nm: str
    category: Optional[str] = "child"
    district: Optional[str] = "천안시"
    year: Optional[str] = "2023"
    checklist_score: Optional[int] = 60
    missing_labels: Optional[List[str]] = None
    accident: Optional[bool] = False
    deaths: Optional[int] = 0
    serious: Optional[int] = 0
    minor: Optional[int] = 0
    casualties: Optional[int] = 0
    occrrnc_cnt: Optional[int] = 0
    road_shape: Optional[str] = "일반 교차로 및 단일로"
    has_zone: Optional[bool] = False
    cctv_count: Optional[int] = 0
    bump_count: Optional[int] = 0
    ped_light_count: Optional[int] = 0
    countdown_count: Optional[int] = 0


class TipsResponse(BaseModel):
    guardianTips: List[str]
    pedestrianTips: List[str]
    source: str
    diagnosis: Optional[str] = None
    risk_level: Optional[str] = None


FINE_TUNE_SYSTEM = (
    "당신은 도로교통공단 및 천안시 교통안전 전문 진단 AI 어드바이저입니다. "
    "교통사고 다발 지점의 실측 사상자 규모와 반경 300m 내 안전시설 결측 데이터를 종합 분석하여 "
    "위험도 등급, 구조적 원인 진단, 운전자 및 보행약자 맞춤 행동 수칙, 천안시 맞춤 인프라 개선안을 "
    "엄격한 JSON 규격으로 반환하십시오."
)


def _clean_tip_lines(items: List[str], limit: int = 3) -> List[str]:
    cleaned: List[str] = []
    for raw in items:
        if not raw or len(str(raw).strip()) < 5:
            continue
        text = str(raw).strip()
        if not text.endswith((".", "!", "요", "다", "오", "다.")):
            text += "."
        cleaned.append(text)
        if len(cleaned) >= limit:
            break
    return cleaned


def map_diagnosis_to_tips(parsed: dict, req: TipsRequest) -> TipsResponse:
    """Map fine-tuned diagnose JSON → guardian/pedestrian tips for the UI."""
    diagnosis = str(parsed.get("comprehensive_diagnosis") or "").strip()
    ped_rules = parsed.get("pedestrian_rules") or []
    driver_rules = parsed.get("driver_rules") or []
    infra = parsed.get("infrastructure_recommendations") or []
    if not isinstance(ped_rules, list):
        ped_rules = [str(ped_rules)]
    if not isinstance(driver_rules, list):
        driver_rules = [str(driver_rules)]
    if not isinstance(infra, list):
        infra = [str(infra)]

    who = "어르신" if req.category == "elder" else "어린이"
    guardian: List[str] = []
    if diagnosis:
        guardian.append(diagnosis)
    guardian.extend(_clean_tip_lines([str(x) for x in ped_rules], 2))
    if infra:
        guardian.append(f"보호자 참고: {str(infra[0]).strip()}")
    if req.missing_labels:
        guardian.append(
            f"이 구간은 {', '.join(req.missing_labels)} 데이터가 취약하니 {who}과 함께 횡단할 때 시야를 확보하세요."
        )

    pedestrian = _clean_tip_lines([str(x) for x in ped_rules], 2)
    if not pedestrian and driver_rules:
        pedestrian = _clean_tip_lines([str(x) for x in driver_rules], 2)

    guardian = _clean_tip_lines(guardian, 3)
    if not guardian:
        raise ValueError("empty mapped tips")

    return TipsResponse(
        guardianTips=guardian,
        pedestrianTips=pedestrian or guardian[:1],
        source="ollama_ai",
        diagnosis=diagnosis or None,
        risk_level=str(parsed.get("risk_level") or "") or None,
    )


@app.post("/api/tips", response_model=TipsResponse)
async def generate_tips(req: TipsRequest):
    """Fine-tuned diagnose prompt → map to tips. No default_text fallback."""
    cache_key = (
        f"tips_v2:{req.spot_nm}:{req.category}:{req.checklist_score}:"
        f"{req.deaths}:{req.casualties}:{req.cctv_count}:{req.bump_count}:"
        f"{req.ped_light_count}:{req.countdown_count}"
    )
    cached = cache.get(cache_key)
    if cached and getattr(cached, "source", None) == "ollama_ai":
        return cached

    deaths = req.deaths or 0
    serious = req.serious or 0
    minor = req.minor or 0
    casualties = req.casualties or (deaths + serious + minor)
    occ = req.occrrnc_cnt or casualties
    severe_rate = round(((deaths + serious) / casualties) * 100) if casualties > 0 else 0
    target_name = (
        "보행 노인 교통사고 다발지역"
        if req.category == "elder"
        else "어린이보호구역 내 교통사고 다발지역"
    )
    missing = ", ".join(req.missing_labels or []) or "특이 결측 없음"

    prompt = (
        f"지점명: {req.spot_nm}\n"
        f"권역: {req.district or '천안시'}\n"
        f"사고유형: {target_name}\n"
        f"사고통계: 총 사고 {occ}건, 사상자 {casualties}명 "
        f"(사망 {deaths}명, 중상 {serious}명, 경상 {minor}명, 중상 이상 치명률 {severe_rate}%)\n"
        f"도로형태: {req.road_shape or '일반 교차로 및 단일로'}\n"
        f"보호구역 연계: {'보호구역 지정구간' if req.has_zone else '일반 도로구간'}\n"
        f"주변 5대 시설물 실측 현황 (반경 300m): "
        f"단속CCTV {req.cctv_count or 0}대, 과속방지턱 {req.bump_count or 0}개, "
        f"보행신호등 {req.ped_light_count or 0}개, 잔여시간표시기 {req.countdown_count or 0}개, "
        f"결측 점수 {req.checklist_score or 0}점 "
        f"({'핵심 안전시설 취약' if (req.checklist_score or 0) < 60 else '안전 인프라 양호'})\n"
        f"결측시설 요약: {missing}\n"
        "위 실측 데이터를 근거로만 진단하고, 일반론만 나열하지 마십시오."
    )

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": FINE_TUNE_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.2, "top_p": 0.85, "num_predict": 450},
    }

    last_error = "unknown"
    for _ in range(2):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(f"{OLLAMA_HOST}/api/chat", json=payload)
                if resp.status_code != 200:
                    last_error = f"ollama HTTP {resp.status_code}"
                    continue
                content = resp.json().get("message", {}).get("content", "")
                parsed = extract_json_from_llm(content)
                if not parsed:
                    last_error = "invalid json from model"
                    continue
                if "comprehensive_diagnosis" not in parsed and "pedestrian_rules" not in parsed:
                    last_error = "diagnose fields missing"
                    continue
                result = map_diagnosis_to_tips(parsed, req)
                cache[cache_key] = result
                return result
        except Exception as exc:
            last_error = str(exc)
            continue

    raise HTTPException(
        status_code=503,
        detail=f"파인튜닝 모델({OLLAMA_MODEL}) 유의점 생성 실패: {last_error}",
    )


@app.get("/api/admin/config")
def get_admin_config():
    return config_store.load_config()


@app.put("/api/admin/config")
def put_admin_config(body: dict[str, Any], x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    saved = config_store.save_config(body)
    hours = int(saved.get("refreshIntervalHours") or 24)
    refresh_job.schedule_periodic(hours, lambda: refresh_job.run_refresh("schedule"))
    return saved


@app.post("/api/admin/refresh")
def post_admin_refresh(
    body: Optional[dict[str, Any]] = None,
    x_admin_token: Optional[str] = Header(default=None),
):
    require_admin(x_admin_token)
    snapshot = (body or {}).get("snapshot")
    status = refresh_job.run_refresh("manual", snapshot=snapshot)
    cache.clear()
    return status


@app.get("/api/admin/refresh/status")
def get_refresh_status():
    return refresh_job.load_status()


@app.get("/api/data/cache")
def get_data_cache():
    cached = refresh_job.load_cache()
    if not cached:
        return {"available": False, "data": None}
    return {"available": True, "data": cached}


@app.on_event("startup")
def on_startup():
    cfg = config_store.load_config()
    hours = int(cfg.get("refreshIntervalHours") or 24)
    refresh_job.schedule_periodic(hours, lambda: refresh_job.run_refresh("schedule"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("run:app", host="0.0.0.0", port=8000, reload=True)
