"""Button platform for SAWSUBE."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SawsubeCoordinatorEntity, SawsubeTvCoordinatorEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SAWSUBE buttons."""
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    client = hass.data[DOMAIN][entry.entry_id]["client"]

    entities: list[ButtonEntity] = [SawsubeDiscoverButton(coordinator, client)]
    for tv in coordinator.data["tvs"]:
        tv_id = tv["id"]
        entities.extend(
            [
                SawsubeTvPairButton(coordinator, client, tv_id),
                SawsubeTvPowerOnButton(coordinator, client, tv_id),
                SawsubeTvPowerOffButton(coordinator, client, tv_id),
                SawsubeTvArtModeOnButton(coordinator, client, tv_id),
                SawsubeTvArtModeOffButton(coordinator, client, tv_id),
            ]
        )
    async_add_entities(entities)


class SawsubeDiscoverButton(SawsubeCoordinatorEntity, ButtonEntity):
    """Trigger SAWSUBE TV discovery."""

    _attr_name = "Discover TVs"
    _attr_translation_key = "discover_tvs"
    _attr_icon = "mdi:radar"

    def __init__(self, coordinator, client) -> None:
        super().__init__(coordinator)
        self._client = client
        self._attr_unique_id = f"{DOMAIN}_discover_tvs"

    async def async_press(self) -> None:
        await self._client.discover_tvs()
        await self.coordinator.async_request_refresh()


class SawsubeTvButtonBase(SawsubeTvCoordinatorEntity, ButtonEntity):
    """Base class for per-TV action buttons."""

    def __init__(self, coordinator, client, tv_id: int) -> None:
        super().__init__(coordinator, tv_id)
        self._client = client


class SawsubeTvPairButton(SawsubeTvButtonBase):
    _attr_name = "Pair"
    _attr_translation_key = "pair_tv"
    _attr_icon = "mdi:link-plus"

    def __init__(self, coordinator, client, tv_id: int) -> None:
        super().__init__(coordinator, client, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_pair"

    async def async_press(self) -> None:
        await self._client.pair_tv(self.tv_id)
        await self.coordinator.async_request_refresh()


class SawsubeTvPowerOnButton(SawsubeTvButtonBase):
    _attr_name = "Power On"
    _attr_translation_key = "power_on"
    _attr_icon = "mdi:power-on"

    def __init__(self, coordinator, client, tv_id: int) -> None:
        super().__init__(coordinator, client, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_power_on"

    async def async_press(self) -> None:
        await self._client.power_on(self.tv_id)
        await self.coordinator.async_request_refresh()


class SawsubeTvPowerOffButton(SawsubeTvButtonBase):
    _attr_name = "Power Off"
    _attr_translation_key = "power_off"
    _attr_icon = "mdi:power-off"

    def __init__(self, coordinator, client, tv_id: int) -> None:
        super().__init__(coordinator, client, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_power_off"

    async def async_press(self) -> None:
        await self._client.power_off(self.tv_id)
        await self.coordinator.async_request_refresh()


class SawsubeTvArtModeOnButton(SawsubeTvButtonBase):
    _attr_name = "Art Mode On"
    _attr_translation_key = "artmode_on"
    _attr_icon = "mdi:image-filter-black-white"

    def __init__(self, coordinator, client, tv_id: int) -> None:
        super().__init__(coordinator, client, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_artmode_on"

    async def async_press(self) -> None:
        await self._client.artmode_on(self.tv_id)
        await self.coordinator.async_request_refresh()


class SawsubeTvArtModeOffButton(SawsubeTvButtonBase):
    _attr_name = "Art Mode Off"
    _attr_translation_key = "artmode_off"
    _attr_icon = "mdi:television-off"

    def __init__(self, coordinator, client, tv_id: int) -> None:
        super().__init__(coordinator, client, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_artmode_off"

    async def async_press(self) -> None:
        await self._client.artmode_off(self.tv_id)
        await self.coordinator.async_request_refresh()
