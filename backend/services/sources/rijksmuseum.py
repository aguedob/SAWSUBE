from __future__ import annotations

import asyncio

import httpx

SEARCH_URL = "https://data.rijksmuseum.nl/search/collection"
RESOLVE_URL = "https://data.rijksmuseum.nl/{object_id}"
EDM_PARAMS = {"_profile": "edm-framed", "_format": "jsonld"}


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _pick_localized(value, lang: str = "en") -> str | None:
    if isinstance(value, dict):
        preferred = value.get(lang)
        if isinstance(preferred, list):
            return next((item for item in preferred if isinstance(item, str) and item.strip()), None)
        if isinstance(preferred, str) and preferred.strip():
            return preferred
        for item in value.values():
            picked = _pick_localized(item, lang)
            if picked:
                return picked
        return None
    if isinstance(value, list):
        for item in value:
            picked = _pick_localized(item, lang)
            if picked:
                return picked
        return None
    if isinstance(value, str) and value.strip():
        return value
    return None


def _parse_metadata(payload: dict) -> dict | None:
    cho = payload.get("aggregatedCHO") or {}
    image = payload.get("object") or payload.get("isShownBy") or {}
    image_url = image.get("id")
    if not image_url:
        return None

    object_url = cho.get("id", "")
    object_id = object_url.rstrip("/").split("/")[-1] or None
    object_number = next(iter(_as_list(cho.get("identifier"))), None)
    title = _pick_localized(cho.get("title")) or object_number or object_id

    creators = _as_list(cho.get("creator"))
    credit = None
    for creator in creators:
        labels = creator.get("http://www.w3.org/2004/02/skos/core#prefLabel")
        credit = _pick_localized(labels)
        if credit:
            break

    html = f"https://www.rijksmuseum.nl/en/collection/{object_number}" if object_number else None
    service = image.get("http://rdfs.org/sioc/services#has_service") or {}
    thumb = image_url
    if service.get("id"):
        thumb = f"{service['id']}/full/400,/0/default.jpg"

    return {
        "id": object_id,
        "object_number": object_number,
        "url": image_url,
        "thumb": thumb,
        "title": title,
        "credit": credit,
        "html": html,
    }


async def _resolve_object(client: httpx.AsyncClient, object_url: str) -> dict | None:
    object_id = object_url.rstrip("/").split("/")[-1]
    response = await client.get(RESOLVE_URL.format(object_id=object_id), params=EDM_PARAMS)
    if response.status_code != 200:
        return None
    return _parse_metadata(response.json())


async def _search_once(client: httpx.AsyncClient, field: str, query: str, limit: int) -> list[str]:
    response = await client.get(
        SEARCH_URL,
        params={field: query, "imageAvailable": "true"},
    )
    response.raise_for_status()
    payload = response.json()
    ids = []
    for item in payload.get("orderedItems", []):
        object_id = item.get("id")
        if object_id:
            ids.append(object_id)
        if len(ids) >= limit:
            break
    return ids


async def search(query: str, per_page: int = 20) -> list[dict]:
    limit = max(1, min(per_page, 50))
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        result_sets = await asyncio.gather(
            _search_once(client, "title", query, limit),
            _search_once(client, "creator", query, limit),
            _search_once(client, "description", query, limit),
            return_exceptions=True,
        )

        ordered_ids: list[str] = []
        seen = set()
        for result in result_sets:
            if isinstance(result, Exception):
                continue
            for object_url in result:
                if object_url not in seen:
                    seen.add(object_url)
                    ordered_ids.append(object_url)
                if len(ordered_ids) >= limit:
                    break
            if len(ordered_ids) >= limit:
                break

        if not ordered_ids:
            return []

        details = await asyncio.gather(
            *(_resolve_object(client, object_url) for object_url in ordered_ids),
            return_exceptions=True,
        )

    return [item for item in details if isinstance(item, dict)]


async def get(object_number: str) -> dict | None:
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        return await _resolve_object(client, f"https://id.rijksmuseum.nl/{object_number}")
