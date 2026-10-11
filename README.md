# SWE

React + Vite 기반 교통 안전 정보 웹 앱입니다. 공공데이터포털과 도로교통공단 OpenAPI를 사용합니다.

## 기술 스택

- React 19
- Vite 8
- ESLint

## 시작하기

```bash
npm install
cp .env.example .env   # 값을 채워 넣으세요
npm run dev
```

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `VITE_KOROAD_AUTH_KEY` | 도로교통공단 교통사고정보개방시스템 인증키 |
| `VITE_DATA_GO_KR_API_KEY` | 공공데이터포털 인증키 |

`.env`는 커밋하지 마세요.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 실행 |

## API 프록시

CORS를 피하기 위해 `/api` 경로를 프록시합니다.

| 경로 | 대상 |
| --- | --- |
| `/api/koroad/*` | `https://opendata.koroad.or.kr` |
| `/api/datagokr/*` | `https://apis.data.go.kr` |

- 개발: `vite.config.js`의 `server.proxy`
- 배포: `vercel.json`의 `rewrites`

## 배포 (Vercel)

GitHub 저장소를 Vercel에 연결해 배포하세요. `dist`만 업로드하면 `vercel.json`이 빠져 프록시가 동작하지 않습니다.
