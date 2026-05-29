"""Shared entity helpers for SAWSUBE."""

from __future__ import annotations

from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import SawsubeDataUpdateCoordinator


class SawsubeCoordinatorEntity(CoordinatorEntity[SawsubeDataUpdateCoordinator]):
    """Base class for SAWSUBE coordinator-backed entities."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: SawsubeDataUpdateCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, "server")},
            name="SAWSUBE",
            manufacturer="WB2024",
            model="SAWSUBE Server",
            configuration_url=coordinator.client._base_url,  # noqa: SLF001
        )


class SawsubeTvCoordinatorEntity(SawsubeCoordinatorEntity):
    """Base class for per-TV entities."""

    def __init__(
        self, coordinator: SawsubeDataUpdateCoordinator, tv_id: int
    ) -> None:
        super().__init__(coordinator)
        self.tv_id = tv_id

    @property
    def tv(self) -> dict:
        """Return TV metadata."""
        for tv in self.coordinator.data["tvs"]:
            if tv["id"] == self.tv_id:
                return tv
        return {}

    @property
    def tv_status(self) -> dict:
        """Return TV status."""
        return self.coordinator.data["statuses"].get(self.tv_id, {})

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info for this TV."""
        tv = self.tv
        identifiers = {(DOMAIN, f"tv_{self.tv_id}")}
        connections = set()
        mac = tv.get("mac")
        if mac:
            connections.add((dr.CONNECTION_NETWORK_MAC, mac))
        return DeviceInfo(
            identifiers=identifiers,
            connections=connections,
            manufacturer="Samsung",
            model=tv.get("model") or "Frame TV",
            name=tv.get("name", f"TV {self.tv_id}"),
            sw_version=tv.get("year"),
            via_device=(DOMAIN, "server"),
        )
