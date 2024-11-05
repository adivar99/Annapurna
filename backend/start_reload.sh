export APP_MODULE=main:app

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8080}
LOG_LEVEL=${LOG_LEVEL:-info}

chmod +x ./start_ollama.sh

./start_ollama.sh

# ./prestart.sh

python3 -m uvicorn --reload --host $HOST --port $PORT --log-level $LOG_LEVEL "$APP_MODULE"