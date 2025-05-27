FROM annapurna/backendbuilder

WORKDIR /app

# Copy only necessary files
COPY ./start_reload.sh /
# COPY ./main.py .

# Set entrypoint
ENTRYPOINT ["/bin/sh", "/start_reload.sh"]
