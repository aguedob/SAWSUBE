from __future__ import annotations

import httpx

SEARCH_URL = "https://api.artic.edu/api/v1/artworks/search"
DETAIL_URL = "https://api.artic.edu/api/v1/artworks/{artwork_id}"
DEFAULT_IIIF_URL = "https://www.artic.edu/iiif/2"
DEFAULT_HEADERS = {
    "User-Agent": "SAWSUBE/1.0 (+https://github.com/aguedob/SAWSUBE)",
    "Accept": "application/json",
}
FIELDS = ",".join([
    "id",
    "title",
    "artist_display",
    "artist_title",
    "date_display",
    "image_id",
    "is_public_domain",
    "thumbnail",
    "artwork_type_title",
])


def _image_url(iiif_url: str, image_id: str, width: int) -> str:
    return f"{iiif_url.rstrip('/')}/{image_id}/full/{width},/0/default.jpg"


def _thumb_proxy_url(iiif_url: str, image_id: str, width: int = 400) -> str:
    return f"/api/sources/artic/image/{image_id}?w={width}"


def _normalize_artwork(payload: dict, iiif_url: str | None = None) -> dict | None:
    image_id = payload.get("image_id")
    if not payload.get("is_public_domain") or not image_id:
        return None

    base_iiif_url = (iiif_url or DEFAULT_IIIF_URL).rstrip("/")
    title = payload.get("title") or f"Art Institute of Chicago artwork {payload.get('id')}"
    credit = (
        payload.get("artist_title")
        or payload.get("artist_display")
        or payload.get("artwork_type_title")
        or ""
    )

    return {
        "id": str(payload.get("id")),
        "url": _image_url(base_iiif_url, image_id, 1686),
        "thumb": _thumb_proxy_url(base_iiif_url, image_id),
        "title": title,
        "credit": credit,
        "html": f"https://www.artic.edu/artworks/{payload.get('id')}",
    }


async def search(query: str, per_page: int = 20) -> list[dict]:
    limit = max(1, min(per_page, 50))
    params = {
        "q": query,
        "fields": FIELDS,
        "limit": limit,
        "query[term][is_public_domain]": "true",
    }

    async with httpx.AsyncClient(
        timeout=20.0,
        follow_redirects=True,
        headers=DEFAULT_HEADERS,
    ) as client:
        response = await client.get(SEARCH_URL, params=params)
        response.raise_for_status()
        payload = response.json()
        iiif_url = (payload.get("config") or {}).get("iiif_url") or DEFAULT_IIIF_URL
        return [
            item
            for item in (
                _normalize_artwork(artwork, iiif_url)
                for artwork in payload.get("data", [])
            )
            if item
        ]


async def get(artwork_id: str) -> dict | None:
    async with httpx.AsyncClient(
        timeout=20.0,
        follow_redirects=True,
        headers=DEFAULT_HEADERS,
    ) as client:
        response = await client.get(
            DETAIL_URL.format(artwork_id=artwork_id),
            params={"fields": FIELDS},
        )
        if response.status_code != 200:
            return None
        payload = response.json()
        iiif_url = (payload.get("config") or {}).get("iiif_url") or DEFAULT_IIIF_URL
        return _normalize_artwork(payload.get("data") or {}, iiif_url)
