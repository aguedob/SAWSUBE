"""The Met source unit tests."""
from __future__ import annotations

from unittest.mock import patch


_PAINTING = {
    "objectID": 436121,
    "title": "The Dance Class",
    "artistDisplayName": "Edgar Degas",
    "objectName": "Painting",
    "classification": "Paintings",
    "medium": "Oil on canvas",
    "primaryImage": "https://images.metmuseum.org/CRDImages/ep/original/DT123.jpg",
    "primaryImageSmall": "https://images.metmuseum.org/CRDImages/ep/web-large/DT123.jpg",
    "isPublicDomain": True,
    "objectURL": "https://www.metmuseum.org/art/collection/search/436121",
}

_SCULPTURE = {
    "objectID": 247533,
    "title": "Bronze Figure",
    "artistDisplayName": "Unknown",
    "objectName": "Sculpture",
    "classification": "Sculpture",
    "medium": "Bronze",
    "primaryImage": "https://images.metmuseum.org/CRDImages/ad/original/DT999.jpg",
    "primaryImageSmall": "https://images.metmuseum.org/CRDImages/ad/web-large/DT999.jpg",
    "isPublicDomain": True,
    "objectURL": "https://www.metmuseum.org/art/collection/search/247533",
}


def _fake_client(search_payload: dict, objects: dict[int, dict]):
    class FakeResponse:
        def __init__(self, payload: dict, status_code: int = 200):
            self._payload = payload
            self.status_code = status_code

        def raise_for_status(self):
            if self.status_code >= 400:
                raise Exception(f"HTTP {self.status_code}")

        def json(self):
            return self._payload

    class FakeClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            pass

        async def get(self, url, params=None, **kw):
            if "search" in url:
                return FakeResponse(search_payload)
            object_id = int(url.rstrip("/").split("/")[-1])
            payload = objects.get(object_id)
            return FakeResponse(payload or {}, 200 if payload else 404)

    return FakeClient


async def test_search_filters_to_paintings_only(tmp_workdir):
    from backend.services.sources import metmuseum

    search_payload = {"total": 2, "objectIDs": [436121, 247533]}
    with patch(
        "backend.services.sources.metmuseum.httpx.AsyncClient",
        _fake_client(search_payload, {436121: _PAINTING, 247533: _SCULPTURE}),
    ):
        results = await metmuseum.search("degas", per_page=10)

    assert len(results) == 1
    assert results[0]["id"] == "436121"
    assert results[0]["title"] == "The Dance Class"


async def test_get_still_returns_non_painting_objects_by_id(tmp_workdir):
    from backend.services.sources import metmuseum

    with patch(
        "backend.services.sources.metmuseum.httpx.AsyncClient",
        _fake_client({"total": 0, "objectIDs": []}, {247533: _SCULPTURE}),
    ):
        result = await metmuseum.get("247533")

    assert result is not None
    assert result["id"] == "247533"
