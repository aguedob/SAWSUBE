ARG BUILD_ARCH
FROM node:20-alpine AS frontend

ARG SAWSUBE_GIT_URL="https://github.com/WB2024/SAWSUBE.git"
ARG SAWSUBE_GIT_REF="main"

RUN apk add --no-cache git
WORKDIR /src
RUN git clone --depth 1 --branch "${SAWSUBE_GIT_REF}" "${SAWSUBE_GIT_URL}" .

WORKDIR /src/frontend
RUN npm ci
RUN npm run build

FROM python:3.11-slim

ARG BUILD_VERSION
ARG BUILD_ARCH
ARG SAWSUBE_GIT_URL="https://github.com/WB2024/SAWSUBE.git"
ARG SAWSUBE_GIT_REF="main"

LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.type="app" \
      io.hass.arch="${BUILD_ARCH}"

ENV PYTHONUNBUFFERED=1
ENV FRONTEND_DIST=/app/frontend/dist

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    libjpeg-dev \
    jq \
    zlib1g-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=frontend /src/backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r /app/backend/requirements.txt

COPY --from=frontend /src/backend /app/backend
COPY --from=frontend /src/frontend/dist /app/frontend/dist
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 8000

CMD ["/run.sh"]
