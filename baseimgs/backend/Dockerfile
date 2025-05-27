FROM python:3.12.10-slim-bookworm as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    cargo \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Python dependencies
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.12.10-slim-bookworm

# Copy only necessary files from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Set working directory
WORKDIR /app

# Set Python path
ENV PYTHONPATH=/app

# Clean up
RUN apt-get update && apt-get install -y --no-install-recommends \
    # libffi7 \
    # libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Set entrypoint
ENTRYPOINT ["python", "main.py"]