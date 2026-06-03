import { useEffect, useRef, useState, DragEvent } from 'react'
import { ChevronLeft, ChevronRight, Heart, LoaderCircle, RefreshCw, Send, Trash2, Upload, X } from 'lucide-react'
import { api, Image, TV, makeUrl } from '../lib/api'
import { IconLabel } from '../components/IconLabel'
import { LoadingMessage } from '../components/Loading'
import { useToast } from '../components/Toast'
import { wsClient } from '../lib/ws'

export default function Library() {
  const [images, setImages] = useState<Image[]>([])
  const [tvs, setTvs] = useState<TV[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTvs, setLoadingTvs] = useState(true)
  const [filter, setFilter] = useState({ source: '', favourite: false })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [tvModalMode, setTvModalMode] = useState<'send-selected' | 'send-preview' | 'sync-all' | null>(null)
  const [uploading, setUploading] = useState<{ name: string; pct: number }[]>([])
  const [syncing, setSyncing] = useState<{ tv_id: number; done: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const getDisplayTitle = (img: Image) => img.source_meta?.title || img.filename
  const getDisplayCredit = (img: Image) => img.source_meta?.credit || ''
  const normalizedSearch = search.trim().toLowerCase()
  const visibleImages = normalizedSearch
    ? images.filter((img) => {
        const tags = img.tags?.toLowerCase() ?? ''
        const title = String(img.source_meta?.title || '').toLowerCase()
        const credit = String(img.source_meta?.credit || '').toLowerCase()
        return img.filename.toLowerCase().includes(normalizedSearch)
          || title.includes(normalizedSearch)
          || credit.includes(normalizedSearch)
          || tags.includes(normalizedSearch)
      })
    : images
  const preview = previewIndex === null ? null : visibleImages[previewIndex] ?? null

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.source) params.set('source', filter.source)
    if (filter.favourite) params.set('favourite', 'true')
    try {
      setImages(await api.get<Image[]>('/api/images?' + params.toString()))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    document.title = 'SAWSUBE — Library'
    load()
    setLoadingTvs(true)
    api.get<TV[]>('/api/tvs').then(setTvs).finally(() => setLoadingTvs(false))
  }, [])
  useEffect(() => { load() }, [filter])

  useEffect(() => {
    const unsub = wsClient.on((msg: any) => {
      if (msg.type === 'sync_progress') {
        setSyncing({ tv_id: msg.tv_id, done: msg.done, total: msg.total })
      } else if (msg.type === 'sync_complete') {
        setSyncing(null)
        const txt = msg.failed > 0
          ? `Sync done: ${msg.uploaded} uploaded, ${msg.failed} failed`
          : `Sync done: ${msg.uploaded} uploaded`
        toast.push({ type: msg.failed > 0 ? 'error' : 'success', text: txt })
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (previewIndex === null) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewIndex(null)
      if (e.key === 'ArrowRight') setPreviewIndex((i) => (i === null ? i : (i + 1) % visibleImages.length))
      if (e.key === 'ArrowLeft') setPreviewIndex((i) => (i === null ? i : (i - 1 + visibleImages.length) % visibleImages.length))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewIndex, visibleImages.length])

  useEffect(() => {
    if (previewIndex !== null && previewIndex >= visibleImages.length) setPreviewIndex(null)
  }, [previewIndex, visibleImages.length])

  const upload = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    setUploading(arr.map((f) => ({ name: f.name, pct: 0 })))
    try {
      await api.upload<Image[]>('/api/images/upload', arr)
      toast.push({ type: 'success', text: `Uploaded ${arr.length} file(s)` })
      load()
    } catch (e: any) {
      toast.push({ type: 'error', text: e.message })
    } finally {
      setUploading([])
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files)
  }

  const toggleSel = (id: number) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const sendTo = async (id: number, tv_id: number) => {
    try {
      await api.post(`/api/images/${id}/send/${tv_id}`)
      toast.push({ type: 'success', text: 'Sent to TV' })
    } catch (e: any) { toast.push({ type: 'error', text: e.message }) }
  }
  const fav = async (id: number) => { await api.post(`/api/images/${id}/favourite`); load() }
  const del = async (id: number) => {
    if (!confirm('Delete image?')) return
    await api.del(`/api/images/${id}?also_from_tv=true`); load()
  }

  const bulkSend = async (tv_id: number) => {
    await Promise.all(Array.from(selected).map((id) => sendTo(id, tv_id)))
    setSelected(new Set())
  }

  const syncAllTo = async (tv_id: number) => {
    try {
      const res = await api.post<{ queued: number; already_on_tv: number }>(`/api/images/sync/${tv_id}`)
      if (res.queued === 0) {
        toast.push({ type: 'success', text: `All ${res.already_on_tv} image(s) already on TV` })
      } else {
        toast.push({ type: 'success', text: `Syncing ${res.queued} image(s)…` })
        setSyncing({ tv_id, done: 0, total: res.queued })
      }
    } catch (e: any) { toast.push({ type: 'error', text: e.message }) }
  }
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} images?`)) return
    await Promise.all(Array.from(selected).map((id) => api.del(`/api/images/${id}?also_from_tv=true`).catch(() => null)))
    setSelected(new Set()); load()
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={(e) => {
        if (!selected.size || !gridRef.current) return
        if (gridRef.current.contains(e.target as Node)) setSelected(new Set())
      }}
    >
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl">Library</h1>
            <p className="text-sm text-muted max-w-3xl">
              Browse imported images, search filenames and tags, and send images to a TV.
            </p>
          </div>
          <div className="sm:pt-1">
            <button className="btn-primary" onClick={() => fileRef.current?.click()}><IconLabel icon={Upload}>Upload</IconLabel></button>
            <input ref={fileRef} type="file" multiple className="hidden" accept="image/*" onChange={(e) => e.target.files && upload(e.target.files)} />
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.7fr)_auto]">
              <input className="input min-w-0" placeholder="Search filenames or tags" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="input min-w-0" value={filter.source} onChange={(e) => setFilter({ ...filter, source: e.target.value })}>
                <option value="">All sources</option>
                <option value="local">Local</option>
                <option value="unsplash">Unsplash</option>
                <option value="nasa">NASA APOD</option>
                <option value="rijksmuseum">Rijksmuseum</option>
                <option value="metmuseum">The Met</option>
                <option value="artic">Art Institute of Chicago</option>
                <option value="reddit">Reddit</option>
                <option value="pexels">Pexels</option>
                <option value="pixabay">Pixabay</option>
                <option value="openverse">Openverse</option>
              </select>
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => setTvModalMode('sync-all')}
                  disabled={syncing !== null || loadingTvs}
                  title={loadingTvs ? 'Loading TVs…' : 'Sync all images to TV'}
                  aria-label={loadingTvs ? 'Loading TVs' : 'Sync all images to TV'}
                >
                  <RefreshCw size={16} strokeWidth={2} />
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setFilter({ ...filter, favourite: !filter.favourite })}
                  title={filter.favourite ? 'Show all images' : 'Show favourites only'}
                  aria-label={filter.favourite ? 'Show all images' : 'Show favourites only'}
                  aria-pressed={filter.favourite}
                >
                  <Heart size={16} strokeWidth={2} fill={filter.favourite ? 'currentColor' : 'none'} />
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setTvModalMode('send-selected')}
                  disabled={loadingTvs || selected.size === 0}
                  title={loadingTvs ? 'Loading TVs…' : 'Send selected to TV'}
                  aria-label={loadingTvs ? 'Loading TVs' : 'Send selected to TV'}
                >
                  <Send size={16} strokeWidth={2} />
                </button>
                <button className="btn-danger" onClick={bulkDelete} disabled={selected.size === 0} aria-label="Delete selected">
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <LoadingMessage text="Loading library images…" />
      )}

      {!loading && visibleImages.length === 0 && (
        <div className="card p-4 text-sm text-muted">No images found for the current filters.</div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1" ref={gridRef}>
        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        >
          {visibleImages.map((img) => (
            <div
              key={img.id}
              className="card overflow-hidden relative transition-shadow hover:shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {selected.has(img.id) && (
                <div
                  className="pointer-events-none absolute inset-0 z-10 rounded-lg"
                  style={{ boxShadow: 'inset 0 0 0 3px #C8612A, 0 0 0 1px rgba(200,97,42,0.35)' }}
                />
              )}
              <img src={makeUrl(`/api/images/${img.id}/thumbnail`)} alt={getDisplayTitle(img)} className="w-full aspect-[4/3] object-cover cursor-pointer"
                   onClick={() => toggleSel(img.id)}
                   onDoubleClick={() => setPreviewIndex(visibleImages.findIndex((it) => it.id === img.id))} />
              <div className="p-3 text-xs space-y-2">
                <div className="truncate font-medium" title={getDisplayTitle(img)}>{getDisplayTitle(img)}</div>
                <div className="truncate text-muted min-h-[1.25rem]" title={getDisplayCredit(img)}>
                  {getDisplayCredit(img) || '\u00A0'}
                </div>
                <div className="flex justify-between items-center text-muted mt-1">
                  <span className="badge">{img.source}</span>
                  <button onClick={() => fav(img.id)} title="Favourite" aria-label="Toggle favourite">
                    <Heart size={16} strokeWidth={2} fill={img.is_favourite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-center text-xs text-muted">
        <span>
          {loading ? 'Loading images…' : `${visibleImages.length} image${visibleImages.length === 1 ? '' : 's'} · ${selected.size} selected`}
        </span>
        {!loading && selected.size > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <button
              className="text-blue-600 underline hover:text-blue-500"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </button>
          </>
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="card w-full max-w-6xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{getDisplayTitle(preview)}</div>
                <div className="truncate text-sm text-muted">
                  {[getDisplayCredit(preview), preview.source].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost"
                  aria-label="Sync this image to TV"
                  title="Sync this image to TV"
                  onClick={() => setTvModalMode('send-preview')}
                  disabled={loadingTvs}
                >
                  <Send size={16} strokeWidth={2} />
                </button>
                <button
                  className="btn-danger"
                  aria-label="Delete image"
                  title="Delete image"
                  onClick={async () => {
                    const id = preview.id
                    await del(id)
                    setPreviewIndex(null)
                  }}
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
                {visibleImages.length > 1 && (
                  <>
                    <button className="btn-ghost" aria-label="Previous image" title="Previous image" onClick={() => setPreviewIndex((i) => (i === null ? i : (i - 1 + visibleImages.length) % visibleImages.length))}>
                      <ChevronLeft size={16} strokeWidth={2} />
                    </button>
                    <button className="btn-ghost" aria-label="Next image" title="Next image" onClick={() => setPreviewIndex((i) => (i === null ? i : (i + 1) % visibleImages.length))}>
                      <ChevronRight size={16} strokeWidth={2} />
                    </button>
                  </>
                )}
                <button className="btn-ghost" aria-label="Close preview" title="Close preview" onClick={() => setPreviewIndex(null)}>
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="bg-black/80">
              <img
                src={makeUrl(`/api/images/${preview.id}/full`)}
                alt={getDisplayTitle(preview)}
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
            {visibleImages.length > 1 && (
              <div className="border-t border-border px-4 py-2 text-xs text-muted">
                Single click selects. Double click opens preview. Use left/right arrow keys to move between images.
              </div>
            )}
          </div>
        </div>
      )}

      {tvModalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setTvModalMode(null)}
        >
          <div
            className="card w-full max-w-md p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <div className="font-semibold">
                {tvModalMode === 'sync-all'
                  ? 'Sync all to TV'
                  : tvModalMode === 'send-preview'
                    ? 'Send image to TV'
                    : 'Send selected to TV'}
              </div>
              <div className="text-sm text-muted">
                {tvModalMode === 'sync-all'
                  ? `Choose a TV for all ${images.length} image${images.length === 1 ? '' : 's'}.`
                  : tvModalMode === 'send-preview'
                    ? `Choose a TV for ${preview ? getDisplayTitle(preview) : 'this image'}.`
                    : `Choose a TV for the ${selected.size} selected image${selected.size === 1 ? '' : 's'}.`}
              </div>
            </div>
            <div className="space-y-2">
              {loadingTvs && <div className="text-sm text-muted">Loading TVs…</div>}
              {!loadingTvs && tvs.map((tv) => (
                <button
                  key={tv.id}
                  className="btn-ghost w-full justify-start"
                  onClick={async () => {
                    if (tvModalMode === 'sync-all') await syncAllTo(tv.id)
                    else if (tvModalMode === 'send-preview' && preview) await sendTo(preview.id, tv.id)
                    else await bulkSend(tv.id)
                    setTvModalMode(null)
                  }}
                >
                  {tv.name}
                </button>
              ))}
              {!loadingTvs && tvs.length === 0 && (
                <div className="text-sm text-muted">No TVs available.</div>
              )}
            </div>
            <div className="flex justify-end">
              <button className="btn-ghost" onClick={() => setTvModalMode(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {uploading.length > 0 && (
        <div className="fixed bottom-4 left-4 card p-3 space-y-2 w-72 z-40">
          <div className="text-sm font-semibold inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={16} strokeWidth={2} />Uploading…</div>
          {uploading.map((u, i) => <div key={i} className="text-xs truncate">{u.name}</div>)}
        </div>
      )}

      {syncing && (
        <div className="fixed bottom-4 right-4 card p-3 w-72 sm:w-80 max-w-[calc(100vw-2rem)] z-40 space-y-2">
          <div className="text-sm font-semibold inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={16} strokeWidth={2} />Syncing to TV… {syncing.done}/{syncing.total}</div>
          <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
            <div className="bg-accent h-2 rounded-full transition-all"
                 style={{ width: `${syncing.total > 0 ? (syncing.done / syncing.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
