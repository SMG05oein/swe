# 교통약자 보행경로 안전 서비스 (SWE)

보호자가 어린이·노인의 보행 경로가 안전한지 미리 확인하고, 관리자가 공공데이터 갱신과 체크리스트 평가 기준을 관리하는 웹 서비스입니다. 서비스 권역은 천안시(신부동·두정동)를 중심으로 합니다.

## 기술 스택

| 구분 | 구성 |
| --- | --- |
| 프론트엔드 | React 19, Vite, react-router-dom, Leaflet (OSM) |
| 백엔드 | FastAPI, Ollama (`cheonan-safety` 파인튜닝 모델) |
| 데이터 | 도로교통공단·공공데이터포털 (Vite 프록시), OSRM 보행 경로, Nominatim 장소검색 |
| 인프라 | Docker Compose (`backend` + `ollama`) |

## 주요 기능

### 보호자 화면 (`/`)

- 교통약자 유형 선택 (어린이 / 노인)
- 출발지·도착지 지정 (장소 검색 또는 지도 클릭)
- 보행 경로 표시, 거리·보행 예상 소요시간
- 경로 주변 위험 구역 개수·목록 (사고다발지역 또는 체크리스트 미달 보호구역)
- 경로 위험 등급 (안전 / 주의 / 위험)
- 위험 회피 대체 경로 요청 및 경로 비교(카드 클릭으로 지도 전환)
- 구역 상세: 체크리스트·사고 통계·AI 유의점
- 지도 레이어 ON/OFF (어린이보호구역, 실버존, 사고다발지역), 사고 연도 선택
- 사이드바 너비 드래그 조절

### 관리자 화면 (`/admin`)

- `ADMIN_TOKEN`으로 입장
- 체크리스트 항목·가중치·합격 기준·경로 등급 임계값·갱신 주기 변경
- 공공데이터 수동 갱신 및 상태 확인

### 안전·예외 처리

- 체크리스트: 데이터 없는 항목은 **감점하지 않고** `정보 없음`으로 표시
- AI는 유의점 문장만 생성하며 **점수를 바꾸지 않음**
- 유의점은 파인튜닝 모델(`cheonan-safety`)의 진단 형식 프롬프트로 생성 (일반 기본문구 폴백 없음)
- 공공데이터포털 장애 시 천안 샘플 사고·시설 데이터로 서비스 계속, 상단에 안내 배너 표시

## 빠른 시작

### 1. 환경 변수

`.env.example`을 복사해 `.env`를 만들고 키를 넣습니다.

```bash
copy .env.example .env
```

주요 키:

- `VITE_DATA_GO_KR_API_KEY` / `VITE_KOROAD_AUTH_KEY` — 공공데이터·도로교통공단
- `ADMIN_TOKEN` — 관리자 화면·관리 API
- `OLLAMA_HOST`, `OLLAMA_MODEL` — 기본값 `cheonan-safety`

실제 키는 커밋하지 마세요.

### 2. 프론트엔드

```bash
npm install
npm run dev
```

- 주소: http://localhost:5173/
- 빌드: `npm run build`
- 린트: `npm run lint`

### 3. 백엔드 + AI (권장: Docker)

```bash
docker compose up -d
```

- API: http://localhost:8000/
- Ollama: http://localhost:11434/
- 헬스체크: http://localhost:8000/api/health

로컬에서만 백엔드를 띄울 경우:

```bash
cd Back
pip install -r requirements.txt
set ADMIN_TOKEN=change-me-admin-token
python run.py
```

Windows PowerShell 예:

```powershell
$env:ADMIN_TOKEN="change-me-admin-token"
python run.py
```

파인튜닝 모델이 Ollama에 등록되어 있어야 유의점이 생성됩니다.

```bash
docker exec -it cheonan_safety_ollama ollama list
```

`cheonan-safety`가 보이면 정상입니다. 유의점 생성에는 보통 30~60초 정도 걸릴 수 있습니다.

## 화면 경로

| 경로 | 설명 |
| --- | --- |
| `/` | 보호자 보행경로 안전 화면 |
| `/admin` | 관리자 설정·데이터 갱신 |

## API 요약 (백엔드)

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/health` | Ollama 연결·모델 상태 |
| POST | `/api/tips` | 파인튜닝 모델 기반 유의점 (점수 미포함) |
| POST | `/api/diagnose` | 기존 지점 진단 API |
| GET/PUT | `/api/admin/config` | 체크리스트·등급 설정 (PUT은 관리자 토큰) |
| POST | `/api/admin/refresh` | 데이터 갱신 기록 (관리자 토큰) |
| GET | `/api/admin/refresh/status` | 갱신 상태 |
| GET | `/api/data/cache` | 서버 캐시 스냅샷 |

관리 API는 헤더 `X-Admin-Token`에 `ADMIN_TOKEN` 값을 넣습니다.

## 프론트 프록시 (개발)

Vite(`vite.config.js`)가 아래 경로를 외부 API로 프록시합니다.

- `/api/datagokr`, `/api/koroad`, `/api/koroad_portal` — 공공데이터·도로교통공단
- `/api/osrm` — 보행 경로 (경로 기하)
- `/api/nominatim` — 장소 검색·역지오코딩

보행 예상 시간은 OSRM 소요시간 대신 **보행 속도(어린이·노인)** 기준으로 재산정합니다.

## 프로젝트 구조 (요약)

```
src/
  pages/          Main(보호자), Admin(관리자)
  components/     지도, 경로입력, 위험목록, 상세모달 등
  domain/         체크리스트·위험구역·경로등급 순수 로직
  api/            공공데이터·경로·지오코딩·AI·관리자 클라이언트
  data/           지역 프리셋, 신호등, 샘플 사고 데이터
Back/
  run.py          FastAPI 엔트리
  services/       설정 저장·갱신 잡
  data/           checklist_config.json 등
  AI/             파인튜닝 데이터·Modelfile·GGUF
```

## 알려진 제약

- 공공데이터포털이 타임아웃되면 실시간 대신 샘플 데이터로 동작합니다.
- 위험 회피 경로는 위험 지점 우회 웨이포인트 방식이라 최적 다중 대안은 아닙니다.
- 관리자 인증은 데모용 토큰 방식입니다.
- AI 유의점은 GPU/CPU 환경에 따라 지연될 수 있습니다.

## 라이선스·데이터 고지

지도 타일·Nominatim·OSRM은 각 서비스 이용 정책을 따릅니다. 공공데이터는 해당 포털·도로교통공단 이용약관을 준수해야 하며, 본 서비스의 안내는 참고용이며 법적 안전 보증이 아닙니다.
