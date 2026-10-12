FROM python:3.12-slim

WORKDIR /app

# 파이썬 의존성 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 서버 소스 코드 및 설정 가이드 파일 복사 (AI 모델은 올라마가 직접 볼륨 마운트)
COPY run.py .
COPY DOCKER_GUIDE.txt .

# 백엔드 API 포트 개방
EXPOSE 8000

# 기본 환경 변수 설정 (도커 네트워크 내부 올라마 컨테이너 주소)
ENV OLLAMA_HOST=http://ollama:11434
ENV OLLAMA_MODEL=cheonan-safety

# 패스트에이피아이 프로덕션 서버 구동
CMD ["uvicorn", "run:app", "--host", "0.0.0.0", "--port", "8000"]
