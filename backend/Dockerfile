FROM annapurna/backendbuilder AS builder

ENV PYTHONPATH=/app
WORKDIR /app

# COPY app .
COPY ./start_reload.sh /

ENTRYPOINT ["/bin/sh"]
CMD ["/start_reload.sh"]
