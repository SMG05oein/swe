# 스마트 교통약자 안전 인텔리전스 대시보드 (SWE)

React 19와 FastAPI, 그리고 온디바이스 로컬 LLM(Qwen2.5-7B 파인튜닝) 기반의 천안시 교통약자(어린이·노인) 안전 인텔리전스 시스템입니다.
공공데이터포털(`apis.data.go.kr`)과 도로교통공단 실시간 OpenAPI, 천안시 실측 교통안전 인프라 빅데이터를 통합 분석하고, 파인튜닝된 AI 모델을 통해 지점별 구조적 사고 원인 진단과 맞춤형 교통안전 대책을 실시간으로 도출합니다.

---

## 🛠️ 기술 스택 및 아키텍처

### 1. Frontend
- **Framework**: React 19, Vite
- **Mapping & GIS**: Leaflet (OpenStreetMap 기반 다크 테마 커스텀 타일)
- **Styling**: Vanilla CSS (Cyber/Navy 다크 테마 디자인 시스템, Glassmorphism, 반응형 레이아웃)

### 2. Backend & AI Intelligence
- **Backend API**: FastAPI 0.110+ (Python 3.12, Uvicorn, 인메모리 고속 캐싱 엔진)
- **LLM Engine**: Ollama (Docker 컨테이너, NVIDIA GPU VRAM 가속 및 시스템 RAM 하이브리드 오프로딩)
- **AI Model**: Qwen2.5-7B-Instruct 4-bit QLoRA 파인튜닝 모델 (`cheonan-safety`)
  - Google Colab(T4 GPU)에서 천안시 실측 사고 데이터 및 5대 안전시설 결측 통계 기반 정밀 지도 학습
  - GGUF 양자화 변환 후 로컬 Docker 환경에서 실시간 추론 연동

### 3. Container & Deployment
- **Containerization**: Docker & Docker Compose v2
- **Services**:
  - `backend` (FastAPI REST API, 포트 `8000`)
  - `ollama` (Ollama 추론 서버, 포트 `11434`, GPU 리소스 예약)

---

## 🚀 주요 기능

### 1. 온디바이스 파인튜닝 AI 안전 인텔리전스 진단 (신규)
- **실시간 AI 심층 진단**: 다발 지점의 실측 사고 사상자(사망·중상·치명률)와 반경 300m 내 5대 시설물 결측 데이터를 기반으로 LLM이 2~3문장의 구조적 원인 진단 실시간 생성
- **맞춤형 행동 수칙 도출**: 운전자(감속·일시정지·사각지대 확인) 및 보행약자(어린이·고령자 횡단) 맞춤 행동 가이드라인 생성
- **천안시 시설 개선안 권고**: 신호 잔여시간표시기, 고원식 과속방지턱, 바닥형 보행신호등 등 천안시 행정에 건의할 인프라 보강안 제시
- **무장애 자동 폴백(Fallback)**: AI 서버 미기동 또는 네트워크 지연 시 100% 규칙 기반 알고리즘으로 즉시 자동 전환되어 서비스 중단 방지
- **초고속 인메모리 캐싱**: 동일 지점 재조회 시 0.001초 이내 즉시 응답

### 2. 취약계층 2대 사고다발지역 실시간 공간 분석
- **보행 노인 사고**: 고령 보행자 교통사고 다발지역 (`frequentzoneOldman`)
- **어린이 사고**: 어린이 보호구역 내 사고 (`schoolzoneChild`) 및 보행 어린이 사고 (`frequentzoneChild`)
- **법규위반 사고**: 신호위반 및 중앙선침범 다발구역 분석

### 3. 다개년 통계 연도 조회 (2012년 ~ 2025년)
- 2012년부터 2025년까지 개별 연도 선택 조회
- 최근 3개년(2022~2024년) 및 2012~2025년 전체 통합 조회 지원

### 4. 천안시 5대 안전시설 결측도 정밀 매핑
- 천안시 단속·방범 CCTV, 감속 과속방지턱, 보행신호등, 잔여시간표시기, 보호구역 연계 공간 분석
- 5대 안전시설 구비 여부 기반 인프라 결측 진단 점수(0~100점) 자동 산출

### 5. 세부 심층 분석 모달
- 인명 피해 심각도 및 치명률 바 차트 시각화
- 시설물 구비/결측 체크리스트 및 도로 기하구조 분석

---

## 💻 빠른 시작 가이드 (Quick Start)

### 1. 프론트엔드 실행

```bash
# 의존성 설치
npm install

# 환경 변수 파일 생성 (.env.example 복사 후 인증키 설정)
cp .env.example .env

# 프론트엔드 개발 서버 시작 (기본 포트: 5173)
npm run dev
```

### 2. 백엔드 및 AI 도커(Docker) 컨테이너 실행

Docker Desktop이 실행된 상태에서 프로젝트 루트 경로에서 아래 명령어를 실행합니다:

```powershell
# 백엔드(FastAPI) 및 올라마(Ollama) 컨테이너 빌드 & 백그라운드 실행
docker compose up -d --build

# (최초 1회 실행) 천안시 파인튜닝 AI 모델 올라마 등록
docker exec -w /root/ai_models -it cheonan_safety_ollama ollama create cheonan-safety -f Modelfile
```

> [!NOTE]
> AI 모델 배포 및 도커 데스크톱 환경 설정에 대한 상세한 가이드는 [`Back/DOCKER_GUIDE.txt`](file:///c:/Work/SWE/Back/DOCKER_GUIDE.txt)를 참조하세요.

---

## ⚙️ 환경 변수 설정 (`.env`)

| 변수명 | 설명 | 비고 |
| --- | --- | --- |
| `VITE_DATA_GO_KR_API_KEY` | 공공데이터포털(apis.data.go.kr) 일반 인증키 | 필수 |
| `VITE_KOROAD_AUTH_KEY` | 도로교통공단 포털 인증키 | 보조용 |

---

## 📁 프로젝트 구조

```text
SWE/
├── Back/                       # 백엔드 및 AI 서비스
│   ├── AI/                     # AI 학습 및 모델 정의
│   │   ├── Modelfile           # Ollama 모델 파라미터 및 프롬프트 정의
│   │   ├── dataset.jsonl       # 천안시 실측 데이터 기반 학습 데이터셋 (350건)
│   │   ├── train.jsonl         # 훈련 데이터셋 (297건)
│   │   ├── valid.jsonl         # 검증 데이터셋 (53건)
│   │   ├── generate_dataset.py # 데이터셋 자동 생성 스크립트
│   │   └── train_colab.py      # Google Colab T4 GPU 학습 파이프라인
│   ├── Dockerfile              # 백엔드 경량 컨테이너 정의 (경량 빌드 최적화)
│   ├── .dockerignore           # 대용량 모델 파일 전송 방지 설정
│   ├── DOCKER_GUIDE.txt        # 도커 배포 및 유지보수 상세 가이드
│   ├── requirements.txt        # 파이썬 의존성 패키지 (FastAPI, Uvicorn, httpx 등)
│   └── run.py                  # FastAPI 백엔드 서버 및 Ollama 연동/폴백 로직
├── src/                        # 프론트엔드 React 소스 코드
│   ├── api/                    # 실시간 OpenAPI 및 AI 백엔드 연동 클라이언트
│   │   ├── aiApi.js            # FastAPI AI 진단 API 통신 모듈
│   │   ├── facilitiesApi.js    # 공간 분석 및 시설물 실측 매핑
│   │   └── trafficApi.js       # 공공데이터포털 실시간 수집 모듈
│   ├── components/             # UI 컴포넌트 (지도, 카드, 모달 등)
│   │   ├── DetailModal.jsx     # AI 실시간 진단 모달 컴포넌트
│   │   └── DetailModal.css     # 모달 및 AI 진단 카드 전용 스타일
│   └── pages/                  # 메인 대시보드 페이지
├── docker-compose.yml          # FastAPI + Ollama 컨테이너 오케스트레이션
└── vite.config.js              # Vite 빌드 및 CORS 리라이트 프록시 설정
```

---

## 🔌 API 명세 요약 (FastAPI 백엔드)

- **`GET /api/health`**: 백엔드 서버 상태 및 Ollama 연결, 등록된 AI 모델 목록 확인
- **`POST /api/diagnose`**: 지점별 사고 통계 및 시설물 결측치를 바탕으로 AI 정밀 진단 반환
  - 요청: `spot_nm`, `district`, `category`, `casualties`, `deaths`, `serious`, `cctv_count`, `bump_count` 등
  - 응답: `risk_level`, `comprehensive_diagnosis`, `driver_rules`, `pedestrian_rules`, `infrastructure_recommendations`, `source`
- **`POST /api/cache/clear`**: 서버 인메모리 캐시 초기화
