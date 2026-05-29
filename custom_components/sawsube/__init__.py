"""The SAWSUBE integration."""

from __future__ import annotations

from aiohttp import ClientSession
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import SawsubeApiClient
from .const import CONF_UPDATE_INTERVAL, CONF_VERIFY_SSL, DOMAIN, PLATFORMS
from .coordinator import SawsubeDataUpdateCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up SAWSUBE from a config entry."""
    session: ClientSession = async_get_clientsession(hass)
    client = SawsubeApiClient(
        session=session,
        base_url=entry.data[CONF_URL],
        verify_ssl=entry.data[CONF_VERIFY_SSL],
    )
    coordinator = SawsubeDataUpdateCoordinator(
        hass=hass,
        client=client,
        update_interval=entry.options.get(
            CONF_UPDATE_INTERVAL, entry.data[CONF_UPDATE_INTERVAL]
        ),
    )
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "client": client,
        "coordinator": coordinator,
    }

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(async_reload_entry))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unloaded


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload config entry."""
    await hass.config_entries.async_reload(entry.entry_id)
