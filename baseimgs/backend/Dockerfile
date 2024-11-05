FROM ollama/ollama:latest

# Install dependencies
RUN apt-get update
RUN apt-get install -y curl python3 python3-pip

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt
