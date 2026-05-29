"""Binary sensors for SAWSUBE."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SawsubeTvCoordinatorEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SAWSUBE binary sensors."""
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    entities: list[BinarySensorEntity] = []
    for tv in coordinator.data["tvs"]:
        tv_id = tv["id"]
        entities.append(SawsubeTvOnlineBinarySensor(coordinator, tv_id))
        entities.append(SawsubeTvArtModeBinarySensor(coordinator, tv_id))
        entities.append(SawsubeTvPairedBinarySensor(coordinator, tv_id))
    async_add_entities(entities)


class SawsubeTvOnlineBinarySensor(SawsubeTvCoordinatorEntity, BinarySensorEntity):
    """TV online sensor."""

    _attr_translation_key = "tv_online"
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY

    def __init__(self, coordinator, tv_id: int) -> None:
        super().__init__(coordinator, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_online"

    @property
    def name(self) -> str:
        return "Online"

    @property
    def is_on(self) -> bool:
        return bool(self.tv_status.get("online"))


class SawsubeTvArtModeBinarySensor(SawsubeTvCoordinatorEntity, BinarySensorEntity):
    """TV art mode sensor."""

    _attr_translation_key = "tv_artmode"
    _attr_icon = "mdi:palette"

    def __init__(self, coordinator, tv_id: int) -> None:
        super().__init__(coordinator, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_artmode"

    @property
    def name(self) -> str:
        return "Art Mode"

    @property
    def is_on(self) -> bool:
        return bool(self.tv_status.get("artmode"))


class SawsubeTvPairedBinarySensor(SawsubeTvCoordinatorEntity, BinarySensorEntity):
    """TV paired sensor."""

    _attr_translation_key = "tv_paired"
    _attr_icon = "mdi:link-variant"

    def __init__(self, coordinator, tv_id: int) -> None:
        super().__init__(coordinator, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_paired"

    @property
    def name(self) -> str:
        return "Paired"

    @property
    def is_on(self) -> bool:
        return bool(self.tv_status.get("paired"))
