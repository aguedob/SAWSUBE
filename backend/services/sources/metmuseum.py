from __future__ import annotations

from difflib import SequenceMatcher

import httpx

SEARCH_URL = "https://collectionapi.metmuseum.org/public/collection/v1/search"
OBJECT_URL = "https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"
DEFAULT_HEADERS = {
    "User-Agent": "SAWSUBE/1.0 (+https://github.com/aguedob/SAWSUBE)",
    "Accept": "application/json",
}


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
        "_artist": payload.get("artistDisplayName") or "",
        "_culture": payload.get("culture") or "",
        "_object_name": payload.get("objectName") or "",
    }


def _score_result(item: dict, query: str) -> float:
    q = query.strip().lower()
    if not q:
        return 0.0

    artist = str(item.get("_artist", "")).lower()
    title = str(item.get("title", "")).lower()
    culture = str(item.get("_culture", "")).lower()
    object_name = str(item.get("_object_name", "")).lower()
    haystacks = [artist, title, culture, object_name]

    score = 0.0
    for idx, text in enumerate(haystacks):
        if not text:
            continue
        weight = 4.0 if idx == 0 else 2.5 if idx == 1 else 1.5
        if q == text:
            score += 100.0 * weight
        if q in text:
            score += 40.0 * weight
        score += SequenceMatcher(None, q, text).ratio() * 10.0 * weight
        for token in q.split():
            if token and token in text:
                score += 8.0 * weight
            score += SequenceMatcher(None, token, text).ratio() * 2.0 * weight
    return score


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

    async with httpx.AsyncClient(
        timeout=20.0,
        follow_redirects=True,
        headers=DEFAULT_HEADERS,
    ) as client:
        response = await client.get(SEARCH_URL, params=params)
        response.raise_for_status()
        payload = response.json()
        object_ids = (payload.get("objectIDs") or [])[: max(limit * 10, 100)]
        if not object_ids:
            return []
        results: list[dict] = []
        for object_id in object_ids:
            try:
                item = await _fetch_object(client, object_id)
            except httpx.HTTPError:
                continue
            if item:
                results.append(item)
            if len(results) >= max(limit * 3, 40):
                break

    ranked = sorted(results, key=lambda item: _score_result(item, query), reverse=True)
    trimmed = ranked[:limit]
    for item in trimmed:
        item.pop("_artist", None)
        item.pop("_culture", None)
        item.pop("_object_name", None)
    return trimmed


async def get(object_id: str) -> dict | None:
    async with httpx.AsyncClient(
        timeout=20.0,
        follow_redirects=True,
        headers=DEFAULT_HEADERS,
    ) as client:
        try:
            return await _fetch_object(client, object_id)
        except httpx.HTTPError:
            return None
