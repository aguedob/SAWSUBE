import { useEffect, useRef, useState, DragEvent } from 'react'
import { Airplay, LoaderCircle, Trash2, Upload } from 'lucide-react'
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
  const [filter, setFilter] = useState({ source: '', tag: '', favourite: false, q: '' })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [uploading, setUploading] = useState<{ name: string; pct: number }[]>([])
  const [syncing, setSyncing] = useState<{ tv_id: number; done: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const preview = previewIndex === null ? null : images[previewIndex] ?? null

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.source) params.set('source', filter.source)
    if (filter.tag) params.set('tag', filter.tag)
    if (filter.favourite) params.set('favourite', 'true')
    if (filter.q) params.set('q', filter.q)
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
      if (e.key === 'ArrowRight') setPreviewIndex((i) => (i === null ? i : (i + 1) % images.length))
      if (e.key === 'ArrowLeft') setPreviewIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [images.length, previewIndex])

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
      className="space-y-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={(e) => {
        if (!selected.size || !gridRef.current) return
        if (!gridRef.current.contains(e.target as Node)) setSelected(new Set())
      }}
    >
      <div className="space-y-2">
        <h1 className="text-2xl">Library</h1>
        <p className="text-sm text-muted max-w-3xl">
          Browse imported images, filter by source or tags, and send selections to a TV.
        </p>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
            <input className="input min-w-0" placeholder="Search filename" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
            <select className="input min-w-0" value={filter.source} onChange={(e) => setFilter({ ...filter, source: e.target.value })}>
              <option value="">All sources</option>
              <option>local</option><option>unsplash</option><option>nasa</option><option>rijksmuseum</option><option>metmuseum</option><option>reddit</option><option>pexels</option><option>pixabay</option><option>openverse</option>
            </select>
            <input className="input min-w-0" placeholder="Tag" value={filter.tag} onChange={(e) => setFilter({ ...filter, tag: e.target.value })} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={filter.favourite} onChange={(e) => setFilter({ ...filter, favourite: e.target.checked })} />
                Favourites only
              </label>
              <div className="text-xs text-muted">
                {loading ? 'Loading images…' : `${images.length} image${images.length === 1 ? '' : 's'}`}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button className="btn-primary" onClick={() => fileRef.current?.click()}><IconLabel icon={Upload}>Upload</IconLabel></button>
              <input ref={fileRef} type="file" multiple className="hidden" accept="image/*" onChange={(e) => e.target.files && upload(e.target.files)} />
              <select className="input min-w-0 sm:min-w-56" disabled={syncing !== null || loadingTvs}
                onChange={(e) => { if (e.target.value) { syncAllTo(Number(e.target.value)); e.target.value = '' } }} defaultValue="">
                <option value="">{loadingTvs ? 'Loading TVs…' : 'Sync all to TV…'}</option>
                {tvs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="text-sm">{selected.size} selected</span>
        <button
          className="btn-ghost"
          onClick={() => setSendModalOpen(true)}
          disabled={loadingTvs || selected.size === 0}
          title={loadingTvs ? 'Loading TVs…' : 'Send selected to TV'}
          aria-label={loadingTvs ? 'Loading TVs' : 'Send selected to TV'}
        >
          <Airplay size={16} strokeWidth={2} />
        </button>
        <button className="btn-danger" onClick={bulkDelete} disabled={selected.size === 0} aria-label="Delete selected">
          <Trash2 size={16} strokeWidth={2} />
        </button>
        <button className="btn-ghost" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>Clear</button>
      </div>

      {loading && (
        <LoadingMessage text="Loading library images…" />
      )}

      {!loading && images.length === 0 && (
        <div className="card p-4 text-sm text-muted">No images found for the current filters.</div>
      )}

      <div className="min-h-24" ref={gridRef}>
        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        >
          {images.map((img) => (
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
              <img src={makeUrl(`/api/images/${img.id}/thumbnail`)} alt={img.filename} className="w-full aspect-[4/3] object-cover cursor-pointer"
                   onClick={() => toggleSel(img.id)}
                   onDoubleClick={() => setPreviewIndex(images.findIndex((it) => it.id === img.id))} />
              <div className="p-3 text-xs space-y-2">
                <div className="truncate font-medium" title={img.filename}>{img.filename}</div>
                <div className="flex justify-between items-center text-muted mt-1">
                  <span className="badge">{img.source}</span>
                  <button onClick={() => fav(img.id)} title="Favourite">{img.is_favourite ? '★' : '☆'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
                <div className="truncate font-semibold">{preview.filename}</div>
                <div className="truncate text-sm text-muted">{preview.source}</div>
              </div>
              <div className="flex items-center gap-2">
                {images.length > 1 && (
                  <>
                    <button className="btn-ghost" onClick={() => setPreviewIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length))}>Prev</button>
                    <button className="btn-ghost" onClick={() => setPreviewIndex((i) => (i === null ? i : (i + 1) % images.length))}>Next</button>
                  </>
                )}
                <button className="btn-ghost" onClick={() => setPreviewIndex(null)}>Close</button>
              </div>
            </div>
            <div className="bg-black/80">
              <img
                src={makeUrl(`/api/images/${preview.id}/full`)}
                alt={preview.filename}
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
            {images.length > 1 && (
              <div className="border-t border-border px-4 py-2 text-xs text-muted">
                Single click selects. Double click opens preview. Use left/right arrow keys to move between images.
              </div>
            )}
          </div>
        </div>
      )}

      {sendModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSendModalOpen(false)}
        >
          <div
            className="card w-full max-w-md p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <div className="font-semibold">Send selected to TV</div>
              <div className="text-sm text-muted">
                Choose a TV for the {selected.size} selected image{selected.size === 1 ? '' : 's'}.
              </div>
            </div>
            <div className="space-y-2">
              {loadingTvs && <div className="text-sm text-muted">Loading TVs…</div>}
              {!loadingTvs && tvs.map((tv) => (
                <button
                  key={tv.id}
                  className="btn-ghost w-full justify-start"
                  onClick={async () => {
                    await bulkSend(tv.id)
                    setSendModalOpen(false)
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
              <button className="btn-ghost" onClick={() => setSendModalOpen(false)}>Close</button>
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
