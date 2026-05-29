"""Data coordinator for SAWSUBE."""

from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import (
    SawsubeApiClient,
    SawsubeApiClientAuthenticationError,
    SawsubeApiClientCommunicationError,
)
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class SawsubeDataUpdateCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Class to manage SAWSUBE polling."""

    def __init__(
        self,
        hass: HomeAssistant,
        client: SawsubeApiClient,
        update_interval: int,
    ) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=update_interval),
        )
        self.client = client

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch the latest SAWSUBE data."""
        try:
            stats = await self.client.stats()
            tvs = await self.client.tvs()
            statuses: dict[int, dict[str, Any]] = {}
            for tv in tvs:
                tv_id = tv["id"]
                try:
                    statuses[tv_id] = await self.client.tv_status(tv_id)
                except SawsubeApiClientCommunicationError as err:
                    _LOGGER.debug("Skipping status update for TV %s: %s", tv_id, err)
                    statuses[tv_id] = {
                        "id": tv_id,
                        "online": False,
                        "artmode": None,
                        "current": None,
                        "paired": False,
                        "error": str(err),
                    }
            return {"stats": stats, "tvs": tvs, "statuses": statuses}
        except SawsubeApiClientAuthenticationError as err:
            raise UpdateFailed(f"authentication failed: {err}") from err
        except SawsubeApiClientCommunicationError as err:
            raise UpdateFailed(f"communication failed: {err}") from err
