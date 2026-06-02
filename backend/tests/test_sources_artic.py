"""Art Institute of Chicago source unit tests."""
from __future__ import annotations

from unittest.mock import patch


_FAKE_ARTWORK = {
    "id": 27992,
    "title": "A Sunday on La Grande Jatte - 1884",
    "artist_display": "Georges Seurat\nFrench, 1859-1891",
    "artist_title": "Georges Seurat",
    "date_display": "1884/1886",
    "image_id": "2d484387-2509-5e8e-2c43-22f9981972eb",
    "is_public_domain": True,
    "thumbnail": {"alt_text": "Detail of painting"},
    "artwork_type_title": "Painting",
}


def _fake_client(response_json: dict, status_code: int = 200, captured: dict | None = None):
    class FakeResponse:
        def __init__(self):
            self.status_code = status_code

        def raise_for_status(self):
            if self.status_code >= 400:
                raise Exception(f"HTTP {self.status_code}")

        def json(self):
            return response_json

    class FakeClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            pass

        async def get(self, url, params=None, **kw):
            if captured is not None:
                captured["url"] = url
                captured["params"] = params or {}
            return FakeResponse()

    return FakeClient


async def test_search_returns_normalized_list(tmp_workdir):
    from backend.services.sources import artic

    payload = {
        "data": [_FAKE_ARTWORK],
        "config": {"iiif_url": "https://www.artic.edu/iiif/2"},
    }
    with patch("backend.services.sources.artic.httpx.AsyncClient", _fake_client(payload)):
        results = await artic.search("seurat", per_page=1)

    assert len(results) == 1
    result = results[0]
    assert result["id"] == "27992"
    assert result["title"] == _FAKE_ARTWORK["title"]
    assert result["credit"] == "Georges Seurat"
    assert result["html"] == "https://www.artic.edu/artworks/27992"
    assert result["thumb"].startswith("/api/sources/artic/image?url=")
    assert "full%2F400%2C%2F0%2Fdefault.jpg" in result["thumb"]
    assert result["url"].endswith("/full/1686,/0/default.jpg")


async def test_search_filters_non_public_domain_items(tmp_workdir):
    from backend.services.sources import artic

    payload = {
        "data": [{**_FAKE_ARTWORK, "is_public_domain": False}],
        "config": {"iiif_url": "https://www.artic.edu/iiif/2"},
    }
    with patch("backend.services.sources.artic.httpx.AsyncClient", _fake_client(payload)):
        results = await artic.search("seurat")
    assert results == []


async def test_search_sends_public_domain_filter_and_limit(tmp_workdir):
    from backend.services.sources import artic

    captured: dict = {}
    payload = {"data": [], "config": {"iiif_url": "https://www.artic.edu/iiif/2"}}
    with patch("backend.services.sources.artic.httpx.AsyncClient", _fake_client(payload, captured=captured)):
        await artic.search("cats", per_page=999)

    assert captured["params"]["query[term][is_public_domain]"] == "true"
    assert captured["params"]["limit"] == 50
    assert "image_id" in captured["params"]["fields"]


async def test_get_returns_none_on_404(tmp_workdir):
    from backend.services.sources import artic

    with patch("backend.services.sources.artic.httpx.AsyncClient", _fake_client({}, status_code=404)):
        result = await artic.get("999999")
    assert result is None


async def test_get_returns_normalized_item(tmp_workdir):
    from backend.services.sources import artic

    payload = {
        "data": _FAKE_ARTWORK,
        "config": {"iiif_url": "https://www.artic.edu/iiif/2"},
    }
    with patch("backend.services.sources.artic.httpx.AsyncClient", _fake_client(payload)):
        result = await artic.get("27992")

    assert result is not None
    assert result["id"] == "27992"
    assert result["credit"] == "Georges Seurat"
