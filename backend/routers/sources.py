from __future__ import annotations
import asyncio
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..config import settings
from ..database import get_session
from ..models.folder import WatchFolder
from ..schemas import FolderCreate, FolderOut, ImportPayload, ImageOut
from ..services.watcher import watcher, scan_folder_now
from ..services.sources import unsplash, nasa_apod, rijksmuseum, reddit, reddit_gallery, pexels, pixabay, openverse, metmuseum, artic
from ..services.sources.common import download_and_register

router = APIRouter(prefix="/api/sources", tags=["sources"])
_ARTIC_IMAGE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Referer": "https://www.artic.edu/",
}


# ── Folders ────────────────────────────────────────────────────────────────
@router.get("/folders", response_model=list[FolderOut])
async def list_folders(s: AsyncSession = Depends(get_session)):
    return (await s.execute(select(WatchFolder))).scalars().all()


@router.post("/folders", response_model=FolderOut)
async def add_folder(payload: FolderCreate, s: AsyncSession = Depends(get_session)):
    path = os.path.abspath(payload.path or "")
    if not path or not os.path.isdir(path):
        raise HTTPException(400, "path does not exist or is not a directory")
    f = WatchFolder(path=path, is_active=payload.is_active, auto_display=payload.auto_display)
    s.add(f)
    await s.commit()
    await s.refresh(f)
    if f.is_active:
        watcher.add(f.id, f.path, asyncio.get_running_loop())
    return f


@router.delete("/folders/{fid}")
async def del_folder(fid: int, s: AsyncSession = Depends(get_session)):
    f = await s.get(WatchFolder, fid)
    if not f:
        raise HTTPException(404)
    watcher.remove(fid)
    await s.delete(f)
    await s.commit()
    return {"ok": True}


@router.post("/folders/{fid}/scan")
async def scan(fid: int, s: AsyncSession = Depends(get_session)):
    f = await s.get(WatchFolder, fid)
    if not f:
        raise HTTPException(404)
    n = await scan_folder_now(f.path)
    return {"added": n}


# ── Unsplash ───────────────────────────────────────────────────────────────
@router.get("/unsplash/search")
async def unsplash_search(q: str = Query(...), per_page: int = 20):
    if not settings.UNSPLASH_API_KEY:
        raise HTTPException(503, "UNSPLASH_API_KEY not configured — add it to .env")
    return await unsplash.search(q, per_page)


@router.post("/unsplash/import", response_model=ImageOut)
async def unsplash_import(payload: ImportPayload):
    if not payload.id:
        raise HTTPException(400, "id required")
    info = await unsplash.get(payload.id)
    if not info:
        raise HTTPException(404)
    img = await download_and_register(
        info["url"], "unsplash", f"unsplash_{info['id']}.jpg",
        {"title": info.get("title"), "credit": info.get("credit"),
         "credit_url": info.get("credit_url"), "html": info.get("html")},
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


# ── NASA APOD ──────────────────────────────────────────────────────────────
@router.get("/nasa/apod")
async def nasa_apod_today():
    res = await nasa_apod.today()
    return res or {}


@router.post("/nasa/apod/import", response_model=ImageOut)
async def nasa_import():
    info = await nasa_apod.today()
    if not info or info.get("unsupported"):
        raise HTTPException(400, "today's APOD not an image")
    img = await download_and_register(
        info["url"], "nasa", f"apod_{info.get('date')}.jpg",
        {"title": info.get("title"), "explanation": info.get("explanation"),
         "date": info.get("date"), "copyright": info.get("copyright")},
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


# ── Rijksmuseum ────────────────────────────────────────────────────────────
@router.get("/rijksmuseum/search")
async def rijks_search(q: str = Query(...), per_page: int = 20):
    return await rijksmuseum.search(q, per_page)


@router.post("/rijksmuseum/import", response_model=ImageOut)
async def rijks_import(payload: ImportPayload):
    if not payload.id:
        raise HTTPException(400, "id required")
    info = await rijksmuseum.get(payload.id)
    if not info:
        raise HTTPException(404)
    img = await download_and_register(
        info["url"], "rijksmuseum", f"rijks_{info['id']}.jpg",
        {"title": info.get("title"), "credit": info.get("credit"), "html": info.get("html")},
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


# ── The Met ────────────────────────────────────────────────────────────────
@router.get("/metmuseum/search")
async def metmuseum_search(q: str = Query(...), per_page: int = 20):
    return await metmuseum.search(q, per_page)


@router.post("/metmuseum/import", response_model=ImageOut)
async def metmuseum_import(payload: ImportPayload):
    if not payload.id:
        raise HTTPException(400, "id required")
    info = await metmuseum.get(payload.id)
    if not info:
        raise HTTPException(404)
    img = await download_and_register(
        info["url"], "metmuseum", f"metmuseum_{info['id']}.jpg",
        {"title": info.get("title"), "credit": info.get("credit"),
         "credit_url": info.get("credit_url"), "html": info.get("html")},
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


# ── Art Institute of Chicago ───────────────────────────────────────────────
@router.get("/artic/search")
async def artic_search(q: str = Query(...), per_page: int = 20):
    return await artic.search(q, per_page)


@router.post("/artic/import", response_model=ImageOut)
async def artic_import(payload: ImportPayload):
    if not payload.id:
        raise HTTPException(400, "id required")
    info = await artic.get(payload.id)
    if not info:
        raise HTTPException(404)
    img = await download_and_register(
        info["url"], "artic", f"artic_{info['id']}.jpg",
        {"title": info.get("title"), "credit": info.get("credit"), "html": info.get("html")},
        headers=_ARTIC_IMAGE_HEADERS,
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


@router.get("/artic/image/{image_id}")
async def artic_image_proxy(
    image_id: str,
    w: int = Query(400, ge=50, le=2000, description="Requested image width"),
):
    if not image_id or any(ch in image_id for ch in "/?#"):
        raise HTTPException(400, "invalid image id")
    image_url = artic._image_url(artic.DEFAULT_IIIF_URL, image_id, w)

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=_ARTIC_IMAGE_HEADERS) as client:
            res = await client.get(image_url)
    except httpx.RequestError as e:
        raise HTTPException(502, f"Could not reach upstream: {e}")

    if res.status_code != 200:
        raise HTTPException(res.status_code, "Upstream image request failed")

    return Response(
        content=res.content,
        media_type=res.headers.get("content-type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=2592000"},
    )


# ── Pexels ────────────────────────────────────────────────────────────────
@router.get("/pexels/search")
async def pexels_search(q: str = Query(...), per_page: int = 20):
    if not settings.PEXELS_API_KEY:
        raise HTTPException(503, "PEXELS_API_KEY not configured — add it to .env")
    return await pexels.search(q, per_page)


@router.post("/pexels/import", response_model=ImageOut)
async def pexels_import(payload: ImportPayload):
    if not payload.id:
        raise HTTPException(400, "id required")
    info = await pexels.get(payload.id)
    if not info:
        raise HTTPException(404)
    img = await download_and_register(
        info["url"], "pexels", f"pexels_{info['id']}.jpg",
        {"title": info.get("title"), "credit": info.get("credit"),
         "credit_url": info.get("credit_url"), "html": info.get("html")},
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


# ── Pixabay ──────────────────────────────────────────────────────────────
@router.get("/pixabay/search")
async def pixabay_search(q: str = Query(...), per_page: int = 20):
    if not settings.PIXABAY_API_KEY:
        raise HTTPException(503, "PIXABAY_API_KEY not configured — add it to .env")
    return await pixabay.search(q, per_page)


@router.post("/pixabay/import", response_model=ImageOut)
async def pixabay_import(payload: ImportPayload):
    if not payload.id:
        raise HTTPException(400, "id required")
    info = await pixabay.get(payload.id)
    if not info:
        raise HTTPException(404)
    img = await download_and_register(
        info["url"], "pixabay", f"pixabay_{info['id']}.jpg",
        {"title": info.get("title"), "credit": info.get("credit"),
         "credit_url": info.get("credit_url"), "html": info.get("html")},
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


# ── Reddit ─────────────────────────────────────────────────────────────────
@router.get("/reddit/fetch")
async def reddit_fetch(sub: str = Query(...), sort: str = "top", t: str = "week", limit: int = 20):
    return await reddit.fetch(sub, sort, t, limit)


@router.post("/reddit/import", response_model=ImageOut)
async def reddit_import(payload: ImportPayload):
    if not payload.url:
        raise HTTPException(400, "url required")
    meta = payload.meta or {}
    img = await download_and_register(
        payload.url, "reddit", f"reddit_{payload.id or 'img'}.jpg", meta,
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


# ── Reddit Galleries ────────────────────────────────────────────────────────
@router.get("/reddit-gallery/fetch")
async def reddit_gallery_fetch(sub: str = Query(...), sort: str = "top", t: str = "week", limit: int = 25):
    return await reddit_gallery.fetch(sub, sort, t, limit)


@router.post("/reddit-gallery/import", response_model=ImageOut)
async def reddit_gallery_import(payload: ImportPayload):
    if not payload.url:
        raise HTTPException(400, "url required")
    meta = payload.meta or {}
    ext = meta.get("ext", "jpg")
    img = await download_and_register(
        payload.url, "reddit", f"reddit_{payload.id or 'img'}.{ext}", meta,
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img


# ── Openverse ───────────────────────────────────────────────────────────────
@router.get("/openverse/search")
async def openverse_search(
    q: str = Query(...),
    page_size: int = 20,
    category: str = "",
    license_type: str = "",
    aspect_ratio: str = "wide",
    size: str = "large",
):
    return await openverse.search(q, page_size, category, license_type, aspect_ratio, size)


@router.post("/openverse/import", response_model=ImageOut)
async def openverse_import(payload: ImportPayload):
    if not payload.id:
        raise HTTPException(400, "id required")
    info = await openverse.get(payload.id)
    if not info:
        raise HTTPException(404)
    ext = info.get("filetype") or (info["url"].rsplit(".", 1)[-1].split("?")[0] or "jpg")[:4]
    img = await download_and_register(
        info["url"], "openverse", f"openverse_{info['id']}.{ext}",
        {"title": info.get("title"), "credit": info.get("credit"),
         "credit_url": info.get("credit_url"), "html": info.get("html"),
         "license": info.get("license"), "source": info.get("source")},
    )
    if not img:
        raise HTTPException(500, "download failed")
    return img
