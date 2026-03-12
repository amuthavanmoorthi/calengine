FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY app ./app
COPY test ./test

# Calc engine runtime port by environment:
# - Development/local Docker host mapping: container listens on 8000
# - Testing (Zeabur): Zeabur injects PORT and the service must bind to it
# - Production: same pattern, bind to the platform-provided PORT
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
