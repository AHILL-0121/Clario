FROM python:3.11-slim

# Install system dependencies (Tesseract, ffmpeg for Whisper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libpq-dev \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download Whisper model at build time (optional; reduces cold start)
# RUN python -c "import whisper; whisper.load_model('base')"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
