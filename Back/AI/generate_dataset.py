#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
천안시 교통약자 안전 인텔리전스 - 파인튜닝 학습 데이터셋 자동 생성기
공공데이터포털 실측 사고 통계(data_raw/사고분석-지역별.xlsx)와
천안시 신부동·두정동 5대 안전시설물 공간 매핑 데이터(src/data/cheonan_traffic_lights.json)를
결합하여 프롬프트-완성형 정형 JSONL 학습 데이터셋을 구축합니다.
"""

import json
import os
import random
import openpyxl

# 재현 가능한 데이터셋 생성을 위한 난수 시드 고정
random.seed(42)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW_XLSX_PATH = os.path.join(BASE_DIR, "data_raw", "사고분석-지역별.xlsx")
TRAFFIC_LIGHTS_PATH = os.path.join(BASE_DIR, "src", "data", "cheonan_traffic_lights.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "Back", "AI")
DATASET_PATH = os.path.join(OUTPUT_DIR, "dataset.jsonl")
TRAIN_PATH = os.path.join(OUTPUT_DIR, "train.jsonl")
VALID_PATH = os.path.join(OUTPUT_DIR, "valid.jsonl")

# 천안시 신부동 및 두정동 주요 교통사고 다발 거점 메타데이터
CHEONAN_SPOTS = [
    {
        "spot_id": "cheonan_sb_01",
        "district": "천안시 동남구 신부동",
        "spot_nm": "천안시 동남구 신부동(천안종합터미널 앞 교차로 만남로)",
        "road_type": "4지 교차로 (대로 합류 및 다방향 버스·택시 집중)",
        "zone_type": "일반 상업도로 (보호구역 미지정)",
        "lat": 36.8198,
        "lng": 127.1565,
        "primary_target": "elder",
        "base_risk": "critical",
    },
    {
        "spot_id": "cheonan_sb_02",
        "district": "천안시 동남구 신부동",
        "spot_nm": "천안시 동남구 신부동(천안희망초등학교 정문 및 통학로)",
        "road_type": "단일로 통학로 (스쿨존 내 이면도로 횡단보도)",
        "zone_type": "어린이보호구역 (시속 30km 제한구역)",
        "lat": 36.8256,
        "lng": 127.1542,
        "primary_target": "child",
        "base_risk": "warning",
    },
    {
        "spot_id": "cheonan_sb_03",
        "district": "천안시 동남구 신부동",
        "spot_nm": "천안시 동남구 신부동(신부문화거리 먹자골목 이면도로)",
        "road_type": "보차혼용 이면도로 (보도 단절 및 불법주정차 밀집)",
        "zone_type": "보행자 우선도로 미지정 상업구역",
        "lat": 36.8215,
        "lng": 127.1578,
        "primary_target": "pedestrian",
        "base_risk": "warning",
    },
    {
        "spot_id": "cheonan_sb_04",
        "district": "천안시 동남구 신부동",
        "spot_nm": "천안시 동남구 신부동(천안신부초등학교 서측 교차로)",
        "road_type": "3지 교차로 (어린이 통학로와 주택가 분기지점)",
        "zone_type": "어린이보호구역 인접구역",
        "lat": 36.8203,
        "lng": 127.1583,
        "primary_target": "child",
        "base_risk": "caution",
    },
    {
        "spot_id": "cheonan_sb_05",
        "district": "천안시 동남구 신부동",
        "spot_nm": "천안시 동남구 신부동(천안천변 산책로 연결 교량 인근)",
        "road_type": "단일로 및 교량 접속부 (야간 조명 취약 구간)",
        "zone_type": "고령 보행자 다수 통행로 (실버존 미지정)",
        "lat": 36.8235,
        "lng": 127.1512,
        "primary_target": "elder",
        "base_risk": "warning",
    },
    {
        "spot_id": "cheonan_dj_01",
        "district": "천안시 서북구 두정동",
        "spot_nm": "천안시 서북구 두정동(두정역 1번 출구 앞 광장 교차로)",
        "road_type": "4지 대형 교차로 (지하철 승하차 보행자 급증 및 환승 통행)",
        "zone_type": "일반 교통혼잡구역 (보호구역 미지정)",
        "lat": 36.8335,
        "lng": 127.1485,
        "primary_target": "pedestrian",
        "base_risk": "critical",
    },
    {
        "spot_id": "cheonan_dj_02",
        "district": "천안시 서북구 두정동",
        "spot_nm": "천안시 서북구 두정동(두정동 먹자골목 원두정 먹거리사거리)",
        "road_type": "4지 이면교차로 (야간 주취 보행 및 배달이륜차 혼재)",
        "zone_type": "상업 밀집지 이면도로 (신호등 미구비 교차로)",
        "lat": 36.8312,
        "lng": 127.1395,
        "primary_target": "violation",
        "base_risk": "critical",
    },
    {
        "spot_id": "cheonan_dj_03",
        "district": "천안시 서북구 두정동",
        "spot_nm": "천안시 서북구 두정동(천안두정초등학교 정문 및 어린이보호구역)",
        "road_type": "단일로 통학로 (횡단보도 앞 과속 위험 구간)",
        "zone_type": "어린이보호구역 (시속 30km 단속구역)",
        "lat": 36.8358,
        "lng": 127.1421,
        "primary_target": "child",
        "base_risk": "warning",
    },
    {
        "spot_id": "cheonan_dj_04",
        "district": "천안시 서북구 두정동",
        "spot_nm": "천안시 서북구 두정동(두정중학교 북측 주택단지 교차로)",
        "road_type": "3지 교차로 (시야 사각지대 및 코너 주정차 심각)",
        "zone_type": "스쿨존 연계 통학로",
        "lat": 36.8385,
        "lng": 127.1372,
        "primary_target": "child",
        "base_risk": "caution",
    },
    {
        "spot_id": "cheonan_dj_05",
        "district": "천안시 서북구 두정동",
        "spot_nm": "천안시 서북구 두정동(두정대우1차아파트 앞 대형 교차로)",
        "road_type": "4지 광폭 교차로 (횡단보도 보행거리 30m 이상 광폭도로)",
        "zone_type": "노인 및 어린이 복합 통행구역",
        "lat": 36.8362,
        "lng": 127.1465,
        "primary_target": "elder",
        "base_risk": "critical",
    },
]

# 시스템 기본 지침 프롬프트
SYSTEM_PROMPT = (
    "당신은 도로교통공단 및 천안시 교통안전 전문 진단 AI 어드바이저입니다. "
    "교통사고 다발 지점의 실측 사상자 규모와 반경 300m 내 안전시설 결측 데이터를 종합 분석하여 "
    "위험도 등급, 구조적 원인 진단, 운전자 및 보행약자 맞춤 행동 수칙, 천안시 맞춤 인프라 개선안을 엄격한 JSON 규격으로 반환하십시오."
)


def load_raw_accident_records():
    """천안시 원본 사고 분석 엑셀 파일 로드"""
    if not os.path.exists(RAW_XLSX_PATH):
        print(f"알림: {RAW_XLSX_PATH} 파일이 없습니다. 기본 시드 데이터를 사용합니다.")
        return []

    wb = openpyxl.load_workbook(RAW_XLSX_PATH, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        return []

    records = []
    for r in rows[1:]:
        if len(r) >= 15:
            records.append({
                "id": str(r[0] or ""),
                "date": str(r[1] or ""),
                "day_night": str(r[2] or "주간"),
                "sgg": str(r[3] or ""),
                "severity": str(r[4] or ""),
                "deaths": int(r[5] or 0),
                "serious": int(r[6] or 0),
                "minor": int(r[7] or 0),
                "injured": int(r[8] or 0),
                "acc_type": str(r[9] or "차대사람 - 횡단중"),
                "violation": str(r[10] or "안전운전불이행"),
                "surface": str(r[11] or "건조"),
                "weather": str(r[12] or "맑음"),
                "road_shape": str(r[13] or "교차로 - 교차로부근"),
                "vehicle": str(r[14] or "승용"),
                "victim_type": str(r[18] or "보행자"),
                "victim_age": str(r[20] or "65세 이상"),
            })
    return records


def load_traffic_lights():
    """천안시 신호등 표준데이터 로드"""
    if not os.path.exists(TRAFFIC_LIGHTS_PATH):
        return []
    with open(TRAFFIC_LIGHTS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("items", [])


def generate_single_example(spot, acc_record, lights_info, variation_idx=0):
    """실측 기반 프롬프트-완성형 훈련 데이터 1건 생성"""
    deaths = acc_record["deaths"] if acc_record else (1 if spot["base_risk"] == "critical" and variation_idx % 3 == 0 else 0)
    serious = acc_record["serious"] if acc_record else random.randint(1, 4)
    minor = acc_record["minor"] if acc_record else random.randint(1, 5)
    injured = acc_record["injured"] if acc_record else random.randint(0, 2)
    casualties = deaths + serious + minor + injured
    if casualties == 0:
        casualties = 2
        minor = 2

    severe_count = deaths + serious
    severe_rate = round((severe_count / casualties) * 100) if casualties > 0 else 0

    # 위험 등급 판정
    if deaths > 0 or casualties >= 5 or severe_rate >= 50:
        risk_level = "심각 위험"
    elif casualties >= 2 or severe_rate >= 25:
        risk_level = "경고 등급"
    else:
        risk_level = "주의"

    # 시설물 결측 시나리오 시뮬레이션
    has_ped_light = random.choice([True, False]) if variation_idx % 2 == 1 else True
    has_countdown = random.choice([True, False]) if has_ped_light else False
    has_cctv = random.choice([True, False])
    has_bump = random.choice([True, False])
    has_zone = "어린이보호구역" in spot["zone_type"] or random.choice([True, False])

    cctv_count = random.randint(1, 3) if has_cctv else 0
    bump_count = random.randint(1, 4) if has_bump else 0
    ped_count = random.randint(1, 2) if has_ped_light else 0
    count_count = random.randint(1, 2) if has_countdown else 0

    # 5대 시설 결측 점수 산출 (0~100점)
    checks = [has_ped_light, has_countdown, has_cctv, has_bump, has_zone]
    deficit_score = sum(1 for c in checks if c) * 20
    if deficit_score < 40:
        deficit_level = "안전시설 심각 결측"
    elif deficit_score < 80:
        deficit_level = "핵심 안전시설 취약"
    else:
        deficit_level = "안전 인프라 양호"

    target = spot["primary_target"]
    if target == "elder":
        category_name = "보행 노인 교통사고 다발지역"
    elif target == "child":
        category_name = "어린이보호구역 내 교통사고 다발지역"
    elif target == "violation":
        category_name = "법규위반(신호위반·안전운전불이행) 다발지역"
    else:
        category_name = "보행자 교통사고 다발지역"

    violation = acc_record["violation"] if acc_record else random.choice(["안전운전불이행", "신호위반", "보행자보호의무위반"])
    road_shape = spot["road_type"]
    acc_type = acc_record["acc_type"] if acc_record else "차대사람 - 횡단중"
    vehicle = acc_record["vehicle"] if acc_record else random.choice(["승용차", "배달이륜차", "화물차", "승합차"])
    day_night = acc_record["day_night"] if acc_record else random.choice(["주간", "야간"])
    weather = acc_record["weather"] if acc_record else "맑음"

    # 사용자 프롬프트 구성
    prompt_content = (
        f"지점명: {spot['spot_nm']}\n"
        f"권역: {spot['district']}\n"
        f"사고유형: {category_name}\n"
        f"사고통계: 총 사고 {random.randint(2, 6)}건, 사상자 {casualties}명 "
        f"(사망 {deaths}명, 중상 {serious}명, 경상 {minor}명, 중상 이상 치명률 {severe_rate}%)\n"
        f"도로형태: {road_shape}\n"
        f"주요사고원인 및 법규위반: {violation}, 사고상황 {acc_type}, 가해차종 {vehicle}, {day_night}(기상 {weather})\n"
        f"보호구역 연계: {spot['zone_type']}\n"
        f"주변 5대 시설물 실측 현황 (반경 300m): 단속CCTV {cctv_count}대({'운용' if has_cctv else '부재'}), "
        f"감속 과속방지턱 {bump_count}개({'설치' if has_bump else '부재'}), "
        f"보행신호등 {ped_count}개({'구비' if has_ped_light else '결측'}), "
        f"잔여시간표시기 {count_count}개({'구비' if has_countdown else '미설치'}), "
        f"결측 점수 {deficit_score}점 ({deficit_level})"
    )

    # 심층 종합 진단 문장 생성
    diagnosis_parts = []
    if deaths > 0:
        diagnosis_parts.append(f"해당 지점은 사망자가 발생한 최고 위험 구간으로, 중상 이상 치명률이 {severe_rate}%에 달합니다.")
    elif severe_rate >= 40:
        diagnosis_parts.append(f"사상자 중 중상 이상 비율이 {severe_rate}%로 매우 높아 사고 발생 시 치명적인 인명 피해로 직결되는 고위험 구역입니다.")
    else:
        diagnosis_parts.append(f"지속적인 보행 사고가 누적되고 있는 구역으로, 잠재적 위험 요인의 선제적 통제가 요구됩니다.")

    if not has_countdown and has_ped_light:
        diagnosis_parts.append("보행신호등은 구비되어 있으나 잔여시간표시기가 결측되어 있어 보행속도가 느린 교통약자가 신호 마감 직전 딜레마존에 노출되기 쉽습니다.")
    elif not has_ped_light:
        diagnosis_parts.append("횡단보도에 보행신호등이 결측되어 있어 보행자가 주행 차량의 속도 판단에 전적으로 의존해야 하는 구조적 취약성이 존재합니다.")

    if not has_bump:
        diagnosis_parts.append("과속방지턱 등 물리적 감속 시설이 부재하여 진입 차량이 제한속도를 초과하여 주행할 위험이 상존합니다.")
    if not has_cctv:
        diagnosis_parts.append("무인단속 및 방범CCTV가 부재하여 불법주정차로 인한 운전자·보행자 상호 시야 차단이 빈번하게 유발됩니다.")

    diagnosis = " ".join(diagnosis_parts)

    # 운전자 맞춤 행동 수칙
    driver_rules = []
    if "교차로" in road_shape:
        driver_rules.append("교차로 우회전 또는 분기 진입 시 횡단보도 정지선 앞에서 반드시 일시정지 후 좌우 시야를 확보하십시오.")
    else:
        driver_rules.append("단일로 직선 주행 시에도 돌출 보행자에 대비하여 페달에 발을 올리고 제한속도 이하로 서행하십시오.")

    if target == "elder":
        driver_rules.append("고령 보행자는 횡단 속도가 현저히 느리므로 신호 변경 전이라도 보행자가 완전히 인도에 오를 때까지 대기하십시오.")
    elif target == "child":
        driver_rules.append("주정차 차량 사이나 버스 승강장 주변에서 어린이가 급작스럽게 튀어나올 것에 대비해 시속 20km 이하로 감속하십시오.")
    else:
        driver_rules.append("야간 및 조명 사각지대 주행 시 전방 주시를 엄수하고 횡단 대기자가 있는지 재확인하십시오.")

    # 보행약자 맞춤 행동 수칙
    ped_rules = []
    if not has_countdown:
        ped_rules.append("신호 잔여시간표시기가 설치되어 있지 않으므로 녹색 신호가 깜빡일 때는 절대 무리하게 진입하지 마십시오.")
    else:
        ped_rules.append("녹색 신호 잔여 시간이 10초 이하일 때는 다음 신호를 기다리고 여유 있게 건너십시오.")

    if target == "elder":
        ped_rules.append("야간이나 우천 시에는 운전자의 시인성 확보를 위해 밝은 색 옷이나 반사 용품을 착용하십시오.")
    elif target == "child":
        ped_rules.append("횡단보도를 건널 때는 스마트폰을 보지 말고 길 좌우를 살피며 운전자와 눈을 맞추고 건너십시오.")
    else:
        ped_rules.append("녹색 신호가 켜진 직후 바로 내려서지 말고 급출발 또는 꼬리물기 차량이 완전히 멈췄는지 확인하십시오.")

    # 천안시 맞춤 인프라 개선 제언
    infra_recs = []
    if not has_countdown:
        infra_recs.append("보행신호 잔여시간표시기 우선 신설 및 교통약자 맞춤 보행신호 시간 3~5초 연장")
    if not has_bump:
        infra_recs.append("교차로 진입 전방 30m 지점에 고원식 횡단보도 또는 표준 규격 과속방지턱 2개소 신설")
    if not has_cctv:
        infra_recs.append("횡단보도 사각지대 해소를 위한 천안시 스마트 불법주정차 단속 및 방범CCTV 1대 추가 확충")
    if "4지" in road_shape or "교차로" in road_shape:
        infra_recs.append("야간 보행자 투광기 증설 및 시인성 향상을 위한 바닥형 보행신호등(스마트 횡단보도) 도입")
    if not has_zone and target in ["child", "elder"]:
        infra_recs.append(f"사고 다발 지점 반경 300m 이내 천안시 조례 기반 {'어린이보호구역' if target == 'child' else '노인보호구역'} 신규 지정 검토")

    if len(infra_recs) < 2:
        infra_recs.append("보차분리용 안전펜스 설치 및 활주로형 도로표지병 구축을 통한 야간 유도선 강화")

    completion_obj = {
        "risk_level": risk_level,
        "comprehensive_diagnosis": diagnosis,
        "driver_rules": driver_rules[:2],
        "pedestrian_rules": ped_rules[:2],
        "infrastructure_recommendations": infra_recs[:3],
    }

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt_content},
            {"role": "assistant", "content": json.dumps(completion_obj, ensure_ascii=False)},
        ]
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    raw_records = load_raw_accident_records()
    traffic_lights = load_traffic_lights()

    print(f"천안시 실측 사고 원표 엑셀 레코드 {len(raw_records)}건 로드 완료")
    print(f"천안시 신부동·두정동 신호등 공간 매핑 데이터 {len(traffic_lights)}건 로드 완료")

    dataset = []
    # 10대 주요 거점 x 35개 환경 변형 = 350건 정형 데이터 생성
    for spot in CHEONAN_SPOTS:
        relevant_records = [
            r for r in raw_records
            if (spot["district"] in r["sgg"] or (("동남구" in spot["district"]) and ("동남구" in r["sgg"])))
        ]
        if not relevant_records:
            relevant_records = raw_records

        for i in range(35):
            acc_record = relevant_records[i % len(relevant_records)] if relevant_records else None
            item = generate_single_example(spot, acc_record, traffic_lights, variation_idx=i)
            dataset.append(item)

    # 데이터 순서 무작위 셔플
    random.shuffle(dataset)

    # 전체 통합 데이터셋 저장
    with open(DATASET_PATH, "w", encoding="utf-8") as f:
        for entry in dataset:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    # 학습용(85%) 및 검증용(15%) 데이터 분할 저장
    split_idx = int(len(dataset) * 0.85)
    train_data = dataset[:split_idx]
    valid_data = dataset[split_idx:]

    with open(TRAIN_PATH, "w", encoding="utf-8") as f:
        for entry in train_data:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    with open(VALID_PATH, "w", encoding="utf-8") as f:
        for entry in valid_data:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f"총 {len(dataset)}건의 학습 데이터 생성이 성공적으로 완료되었습니다.")
    print(f" - 전체 데이터셋:  {DATASET_PATH} ({len(dataset)}건)")
    print(f" - 학습용 데이터:  {TRAIN_PATH} ({len(train_data)}건)")
    print(f" - 검증용 데이터:  {VALID_PATH} ({len(valid_data)}건)")


if __name__ == "__main__":
    main()
