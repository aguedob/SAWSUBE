"""API client for SAWSUBE."""

from __future__ import annotations

from typing import Any

from aiohttp import ClientError, ClientSession


class SawsubeApiClientError(Exception):
    """Base SAWSUBE API client error."""


class SawsubeApiClientCommunicationError(SawsubeApiClientError):
    """Communication error."""


class SawsubeApiClientAuthenticationError(SawsubeApiClientError):
    """Authentication error."""


class SawsubeApiClient:
    """Small async client for the SAWSUBE HTTP API."""

    def __init__(self, session: ClientSession, base_url: str, verify_ssl: bool) -> None:
        self._session = session
        self._base_url = base_url.rstrip("/")
        self._verify_ssl = verify_ssl

    async def _request(
        self, method: str, path: str, payload: dict[str, Any] | None = None
    ) -> Any:
        url = f"{self._base_url}{path}"
        try:
            async with self._session.request(
                method,
                url,
                json=payload,
                ssl=self._verify_ssl,
                timeout=15,
            ) as response:
                if response.status in (401, 403):
                    raise SawsubeApiClientAuthenticationError(
                        f"authentication failed for {url}"
                    )
                response.raise_for_status()
                if response.content_type == "application/json":
                    return await response.json()
                return await response.text()
        except SawsubeApiClientError:
            raise
        except ClientError as err:
            raise SawsubeApiClientCommunicationError(
                f"error communicating with {url}: {err}"
            ) from err

    async def health(self) -> dict[str, Any]:
        """Return backend health."""
        return await self._request("GET", "/api/health")

    async def stats(self) -> dict[str, Any]:
        """Return global stats."""
        return await self._request("GET", "/api/stats")

    async def tvs(self) -> list[dict[str, Any]]:
        """Return all known TVs."""
        return await self._request("GET", "/api/tvs")

    async def tv_status(self, tv_id: int) -> dict[str, Any]:
        """Return TV status."""
        return await self._request("GET", f"/api/tvs/{tv_id}/status")

    async def discover_tvs(self) -> list[dict[str, Any]]:
        """Run TV discovery."""
        return await self._request("GET", "/api/tvs/discover")

    async def pair_tv(self, tv_id: int) -> dict[str, Any]:
        """Trigger TV pairing."""
        return await self._request("POST", f"/api/tvs/{tv_id}/pair")

    async def power_on(self, tv_id: int) -> dict[str, Any]:
        """Wake the TV."""
        return await self._request("POST", f"/api/tvs/{tv_id}/power/on")

    async def power_off(self, tv_id: int) -> dict[str, Any]:
        """Turn the TV off."""
        return await self._request("POST", f"/api/tvs/{tv_id}/power/off")

    async def artmode_on(self, tv_id: int) -> dict[str, Any]:
        """Enable art mode."""
        return await self._request("POST", f"/api/tvs/{tv_id}/artmode/on")

    async def artmode_off(self, tv_id: int) -> dict[str, Any]:
        """Disable art mode."""
        return await self._request("POST", f"/api/tvs/{tv_id}/artmode/off")
