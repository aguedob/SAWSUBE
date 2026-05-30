"""Constants for the SAWSUBE integration."""

from __future__ import annotations

DOMAIN = "sawsube"
NAME = "SAWSUBE"
VERSION = "0.1.17"

CONF_URL = "url"
CONF_VERIFY_SSL = "verify_ssl"
CONF_UPDATE_INTERVAL = "update_interval"

DEFAULT_URL = "http://localhost:8000"
DEFAULT_VERIFY_SSL = True
DEFAULT_UPDATE_INTERVAL = 30

PLATFORMS = ["sensor", "binary_sensor", "button"]
