#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
천안시 교통약자 안전 인텔리전스 - 패스트에이피아이(FastAPI) 백엔드 서버
리액트 프론트엔드 대시보드와 로컬 올라마(Ollama) 인공지능 모델을 실시간 연동하며,
네트워크 장애나 모델 미기동 시에도 중단 없는 100% 규칙 기반 안전 폴백을 제공합니다.
"""

import os
import json
import re
import httpx
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="천안시 교통약자 안전 인텔리전스 API",
    version="1.0.0",
    description="리액트 대시보드와 올라마 LLM을 연동하는 인공지능 진단 백엔드 서비스",
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

# 동일 지점 반복 조회 시 지연 시간을 없애기 위한 인메모리 캐시 딕셔너리
cache = {}


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
        "options": {"temperature": 0.2, "top_p": 0.85},
    }

    # 올라마 비동기 호출 시도
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{OLLAMA_HOST}/api/chat", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("message", {}).get("content", "")
                parsed = extract_json_from_llm(content)
                if parsed and "comprehensive_diagnosis" in parsed:
                    result = DiagnosisResponse(
                        risk_level=parsed.get("risk_level", "경고 등급"),
                        comprehensive_diagnosis=parsed.get("comprehensive_diagnosis", ""),
                        driver_rules=parsed.get("driver_rules", [])[:2],
                        pedestrian_rules=parsed.get("pedestrian_rules", [])[:2],
                        infrastructure_recommendations=parsed.get("infrastructure_recommendations", [])[:3],
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
def clear_cache():
    """인메모리 캐시 초기화 엔드포인트"""
    cache.clear()
    return {"status": "success", "message": "캐시가 성공적으로 초기화되었습니다."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("run:app", host="0.0.0.0", port=8000, reload=True)
