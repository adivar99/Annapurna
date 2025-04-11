FROM python:3.12.10-bookworm as backend-builder

# update packages and install curl
RUN apt update && apt install -y build-essential

RUN pip install --upgrade pip

RUN apt update && apt install -y \
    build-essential \
    # libmusl-dev \
    libffi-dev \
    libssl-dev \
    cargo \
    curl
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
# RUN /bin/bash source ~/.cargo/env
ENV PATH="/root/.cargo/bin:${PATH}"

RUN cargo --version
COPY requirements.txt .
RUN pip install -r ./requirements.txt