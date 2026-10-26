FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY run.py .
COPY services ./services
COPY data ./data
COPY DOCKER_GUIDE.txt .

EXPOSE 8000

ENV OLLAMA_HOST=http://ollama:11434
ENV OLLAMA_MODEL=cheonan-safety
ENV FALLBACK_MODEL=qwen2.5:7b
ENV ADMIN_TOKEN=change-me-admin-token

CMD ["uvicorn", "run:app", "--host", "0.0.0.0", "--port", "8000"]
