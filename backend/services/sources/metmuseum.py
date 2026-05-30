from __future__ import annotations

import asyncio

import httpx

SEARCH_URL = "https://collectionapi.metmuseum.org/public/collection/v1/search"
OBJECT_URL = "https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"


def _normalize_object(payload: dict) -> dict | None:
    image_url = payload.get("primaryImage")
    if not payload.get("isPublicDomain") or not image_url:
        return None

    title = payload.get("title") or payload.get("objectName") or f"Met object {payload.get('objectID')}"
    credit = payload.get("artistDisplayName") or payload.get("culture") or payload.get("department") or ""

    return {
        "id": str(payload.get("objectID")),
        "url": image_url,
        "thumb": payload.get("primaryImageSmall") or image_url,
        "title": title,
        "credit": credit,
        "credit_url": payload.get("artistWikidata_URL") or payload.get("artistULAN_URL") or "",
        "html": payload.get("objectURL") or "",
    }


async def _fetch_object(client: httpx.AsyncClient, object_id: int | str) -> dict | None:
    response = await client.get(OBJECT_URL.format(object_id=object_id))
    if response.status_code != 200:
        return None
    return _normalize_object(response.json())


async def search(query: str, per_page: int = 20) -> list[dict]:
    limit = max(1, min(per_page, 50))
    params = {
        "q": query,
        "hasImages": "true",
    }

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(SEARCH_URL, params=params)
        response.raise_for_status()
        payload = response.json()
        object_ids = (payload.get("objectIDs") or [])[: max(limit * 5, limit)]
        if not object_ids:
            return []

        details = await asyncio.gather(
            *(_fetch_object(client, object_id) for object_id in object_ids),
            return_exceptions=True,
        )

    return [item for item in details if isinstance(item, dict)][:limit]


async def get(object_id: str) -> dict | None:
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        return await _fetch_object(client, object_id)
