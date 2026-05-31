from __future__ import annotations
import json
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    TV_DEFAULT_IP: str = ""
    IMAGE_FOLDER: str = "./data/images"
    DB_PATH: str = "./data/sawsube.db"
    TOKEN_DIR: str = "./data/tokens"
    IMAGE_CACHE_DIR: str = "./data/cache"
    THUMBNAIL_DIR: str = "./data/thumbnails"
    TV_RESOLUTION: str = "4K"  # 4K | 1080p
    PORTRAIT_HANDLING: str = "blur"  # blur | crop | skip
    UPLOAD_MODE: str = "fill"  # fit | fill | stretch
    UNSPLASH_API_KEY: str = ""
    RIJKSMUSEUM_API_KEY: str = ""
    NASA_API_KEY: str = ""
    PEXELS_API_KEY: str = ""
    PIXABAY_API_KEY: str = ""
    REDDIT_USER_AGENT: str = "sawsube/1.0 (local self-hosted)"
    OPENVERSE_CLIENT_ID: str = ""
    OPENVERSE_CLIENT_SECRET: str = ""
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    POLL_INTERVAL_SECS: int = 20
    FRONTEND_DIST: str = "./frontend/dist"
    TIZENBREW_DOWNLOAD_DIR: str = "./data/tizenbrew"
    TIZEN_SDB_PATH: str = ""
    TIZEN_CLI_PATH: str = ""
    RADARR_URL: str = ""
    RADARR_API_KEY: str = ""
    RADARR_USERNAME: str = ""
    RADARR_PASSWORD: str = ""
    SAWSUBE_URL: str = "http://localhost:8000"
    RADARRZEN_SRC_PATH: str = ""
    RADARRZEN_TIZEN_PROFILE: str = "SAWSUBE"
    SONARR_URL: str = ""
    SONARR_API_KEY: str = ""
    SONARRZEN_SRC_PATH: str = ""
    SONARRZEN_TIZEN_PROFILE: str = "SAWSUBE"

    # Navidrome
    NAVIDROME_URL: str = ""
    NAVIDROME_USERNAME: str = ""
    NAVIDROME_PASSWORD: str = ""
    NAVIDROME_SERVER_NAME: str = ""

    # Fieshzen
    FIESHZEN_FEISHIN_SRC_PATH: str = ""
    FIESHZEN_SRC_PATH: str = ""
    FIESHZEN_TIZEN_PROFILE: str = "SAWSUBE"

    # Castafiorezen
    CASTAFIOREZEN_SRC_PATH: str = ""
    CASTAFIOREZEN_TIZEN_PROFILE: str = "SAWSUBE"

    # External API keys
    TMDB_API_KEY: str = ""
    THETVDB_API_KEY: str = ""

    @property
    def resolution_tuple(self) -> tuple[int, int]:
        return (3840, 2160) if self.TV_RESOLUTION.upper() == "4K" else (1920, 1080)


settings = Settings()

RUNTIME_SETTINGS_PATH = os.path.join(os.path.dirname(settings.DB_PATH) or ".", "runtime_settings.json")


def _apply_runtime_overrides() -> None:
    if not os.path.exists(RUNTIME_SETTINGS_PATH):
        return
    try:
        with open(RUNTIME_SETTINGS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return

    upload_mode = str(data.get("upload_mode", "")).strip().lower()
    if upload_mode in {"fit", "fill", "stretch"}:
        settings.UPLOAD_MODE = upload_mode


def runtime_settings_dict() -> dict[str, str]:
    return {
        "upload_mode": settings.UPLOAD_MODE.lower(),
    }


def save_runtime_settings(*, upload_mode: str | None = None) -> dict[str, str]:
    if upload_mode is not None:
        mode = upload_mode.strip().lower()
        if mode not in {"fit", "fill", "stretch"}:
            raise ValueError("upload_mode must be fit, fill, or stretch")
        settings.UPLOAD_MODE = mode

    payload = runtime_settings_dict()
    Path(os.path.dirname(RUNTIME_SETTINGS_PATH) or ".").mkdir(parents=True, exist_ok=True)
    with open(RUNTIME_SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
    return payload


_apply_runtime_overrides()

# Ensure directories exist
for p in [settings.IMAGE_FOLDER, settings.TOKEN_DIR, settings.IMAGE_CACHE_DIR,
          settings.THUMBNAIL_DIR, settings.TIZENBREW_DOWNLOAD_DIR,
          os.path.dirname(settings.DB_PATH) or "."]:
    Path(p).mkdir(parents=True, exist_ok=True)
