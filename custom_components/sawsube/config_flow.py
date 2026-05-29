"""Config flow for SAWSUBE."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_URL
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import SawsubeApiClient, SawsubeApiClientCommunicationError
from .const import (
    CONF_UPDATE_INTERVAL,
    CONF_VERIFY_SSL,
    DEFAULT_UPDATE_INTERVAL,
    DEFAULT_URL,
    DEFAULT_VERIFY_SSL,
    DOMAIN,
)


class SawsubeConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for SAWSUBE."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            await self.async_set_unique_id(user_input[CONF_URL].rstrip("/"))
            self._abort_if_unique_id_configured()

            session = async_get_clientsession(self.hass)
            client = SawsubeApiClient(
                session=session,
                base_url=user_input[CONF_URL],
                verify_ssl=user_input[CONF_VERIFY_SSL],
            )
            try:
                await client.health()
            except SawsubeApiClientCommunicationError:
                errors["base"] = "cannot_connect"
            else:
                return self.async_create_entry(
                    title="SAWSUBE",
                    data={
                        CONF_URL: user_input[CONF_URL].rstrip("/"),
                        CONF_VERIFY_SSL: user_input[CONF_VERIFY_SSL],
                        CONF_UPDATE_INTERVAL: user_input[CONF_UPDATE_INTERVAL],
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_URL, default=DEFAULT_URL): str,
                    vol.Required(
                        CONF_VERIFY_SSL, default=DEFAULT_VERIFY_SSL
                    ): bool,
                    vol.Required(
                        CONF_UPDATE_INTERVAL, default=DEFAULT_UPDATE_INTERVAL
                    ): vol.All(vol.Coerce(int), vol.Range(min=10, max=3600)),
                }
            ),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return SawsubeOptionsFlow(config_entry)


class SawsubeOptionsFlow(config_entries.OptionsFlow):
    """Handle SAWSUBE options."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Manage options."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_UPDATE_INTERVAL,
                        default=self.config_entry.options.get(
                            CONF_UPDATE_INTERVAL,
                            self.config_entry.data[CONF_UPDATE_INTERVAL],
                        ),
                    ): vol.All(vol.Coerce(int), vol.Range(min=10, max=3600)),
                }
            ),
        )
