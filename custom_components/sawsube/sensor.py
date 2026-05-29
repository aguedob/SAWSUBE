"""Sensor platform for SAWSUBE."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry

from .const import DOMAIN
from .entity import SawsubeCoordinatorEntity, SawsubeTvCoordinatorEntity


@dataclass(frozen=True, kw_only=True)
class SawsubeSensorDescription(SensorEntityDescription):
    """Description of a SAWSUBE sensor."""

    value_key: str


GLOBAL_SENSORS: tuple[SawsubeSensorDescription, ...] = (
    SawsubeSensorDescription(
        key="images",
        translation_key="images",
        name="Images",
        icon="mdi:image-multiple",
        value_key="images",
    ),
    SawsubeSensorDescription(
        key="tvs",
        translation_key="tvs",
        name="TVs",
        icon="mdi:television",
        value_key="tvs",
    ),
    SawsubeSensorDescription(
        key="images_on_tv",
        translation_key="images_on_tv",
        name="Images On TV",
        icon="mdi:image-check",
        value_key="images_on_tv",
    ),
    SawsubeSensorDescription(
        key="schedules_active",
        translation_key="schedules_active",
        name="Active Schedules",
        icon="mdi:calendar-sync",
        value_key="schedules_active",
    ),
    SawsubeSensorDescription(
        key="storage_bytes",
        translation_key="storage_bytes",
        name="Storage Used",
        icon="mdi:database",
        native_unit_of_measurement="B",
        suggested_display_precision=0,
        entity_category=EntityCategory.DIAGNOSTIC,
        value_key="storage_bytes",
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SAWSUBE sensors from config entry."""
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    entities: list[SensorEntity] = [
        SawsubeStatsSensor(coordinator, description) for description in GLOBAL_SENSORS
    ]
    entities.extend(
        SawsubeTvCurrentArtSensor(coordinator, tv["id"])
        for tv in coordinator.data["tvs"]
    )
    async_add_entities(entities)


class SawsubeStatsSensor(SawsubeCoordinatorEntity, SensorEntity):
    """Global SAWSUBE stats sensor."""

    entity_description: SawsubeSensorDescription

    def __init__(
        self,
        coordinator,
        description: SawsubeSensorDescription,
    ) -> None:
        super().__init__(coordinator)
        self.entity_description = description
        self._attr_unique_id = f"{DOMAIN}_{description.key}"

    @property
    def native_value(self):
        """Return the sensor state."""
        return self.coordinator.data["stats"].get(self.entity_description.value_key)


class SawsubeTvCurrentArtSensor(SawsubeTvCoordinatorEntity, SensorEntity):
    """Current art sensor for a TV."""

    _attr_translation_key = "current_art"
    _attr_icon = "mdi:image-text"

    def __init__(self, coordinator, tv_id: int) -> None:
        super().__init__(coordinator, tv_id)
        self._attr_unique_id = f"{DOMAIN}_tv_{tv_id}_current_art"

    @property
    def name(self) -> str:
        """Return entity name."""
        return "Current Art"

    @property
    def native_value(self) -> str | None:
        """Return current art name."""
        return self.tv_status.get("current")
