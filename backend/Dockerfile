# Use an official Python runtime as a parent image (3.13+)
FROM python:3.13-slim

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies (including Tectonic and Playwright dependencies)
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    tar \
    unzip \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    && curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh \
    && mv tectonic /usr/local/bin/ \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory to /app
WORKDIR /app

# Copy the backend code
COPY . backend/

# Install pip-tools and compile requirements with explicit backtracking resolver
RUN pip install --no-cache-dir pip-tools && \
    pip-compile --resolver=backtracking backend/requirements.in --output-file backend/requirements.txt && \
    pip install --no-cache-dir -r backend/requirements.txt

# Install Playwright browsers
RUN playwright install chromium

# Expose the port the app runs on
EXPOSE 8000

# Set Python path to ensure imports work correctly
ENV PYTHONPATH=/app

# Start the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
