#!/bin/bash
set -euo pipefail

CONFIG_PATH="/data/options.json"

export TV_DEFAULT_IP
export IMAGE_FOLDER
export DB_PATH="/data/sawsube.db"
export TOKEN_DIR="/data/tokens"
export IMAGE_CACHE_DIR="/data/cache"
export THUMBNAIL_DIR="/data/thumbnails"
export TV_RESOLUTION
export PORTRAIT_HANDLING
export UNSPLASH_API_KEY
export RIJKSMUSEUM_API_KEY
export NASA_API_KEY
export PEXELS_API_KEY
export PIXABAY_API_KEY
export OPENVERSE_CLIENT_ID
export OPENVERSE_CLIENT_SECRET
export HOST="0.0.0.0"
export PORT
export SAWSUBE_URL

json_value() {
  local key="$1"
  jq -r --arg key "${key}" '.[$key] // empty' "${CONFIG_PATH}"
}

PORT="$(json_value 'app_port')"
if [ -z "${PORT}" ] || [ "${PORT}" = "null" ]; then
  PORT="8099"
fi
TV_DEFAULT_IP="$(json_value 'tv_default_ip')"
IMAGE_FOLDER="$(json_value 'image_folder')"
TV_RESOLUTION="$(json_value 'tv_resolution')"
PORTRAIT_HANDLING="$(json_value 'portrait_handling')"
UNSPLASH_API_KEY="$(json_value 'unsplash_api_key')"
RIJKSMUSEUM_API_KEY="$(json_value 'rijksmuseum_api_key')"
NASA_API_KEY="$(json_value 'nasa_api_key')"
PEXELS_API_KEY="$(json_value 'pexels_api_key')"
PIXABAY_API_KEY="$(json_value 'pixabay_api_key')"
OPENVERSE_CLIENT_ID="$(json_value 'openverse_client_id')"
OPENVERSE_CLIENT_SECRET="$(json_value 'openverse_client_secret')"
SAWSUBE_URL="http://localhost:${PORT}"

mkdir -p \
  "${IMAGE_FOLDER}" \
  "${TOKEN_DIR}" \
  "${IMAGE_CACHE_DIR}" \
  "${THUMBNAIL_DIR}"

exec python -m backend.main
