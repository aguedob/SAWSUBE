import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { api, makeUrl } from '../lib/api'
import { useToast } from '../components/Toast'
import { IconLabel } from '../components/IconLabel'
import { Spinner } from '../components/Loading'

type SourceId =
  | 'unsplash'
  | 'nasa-apod'
  | 'rijksmuseum'
  | 'metmuseum'
  | 'artic'
  | 'reddit'
  | 'reddit-gallery'
  | 'pexels'
  | 'pixabay'
  | 'openverse'

type SourceDef = {
  id: SourceId
  title: string
  subtitle: string
  logo?: string
  lightLogoOnDark?: boolean
  mark: string
  palette: {
    background: string
    orb?: string
    accent: string
    text: string
  }
  component: () => JSX.Element
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

const SOURCE_DEFS: SourceDef[] = [
  {
    id: 'unsplash',
    title: 'Unsplash',
    subtitle: 'Editorial-quality photography',
    logo: assetUrl('logos/unsplash.svg'),
    lightLogoOnDark: true,
    mark: 'U',
    palette: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #475569 100%)',
      orb: 'radial-gradient(circle at 72% 24%, rgba(248,250,252,0.22), transparent 34%)',
      accent: '#f8fafc',
      text: '#f8fafc',
    },
    component: Unsplash,
  },
  {
    id: 'nasa-apod',
    title: 'NASA APOD',
    subtitle: 'Astronomy Picture of the Day',
    logo: assetUrl('logos/nasa.svg'),
    mark: 'NASA',
    palette: {
      background: 'linear-gradient(135deg, #020617 0%, #172554 48%, #1d4ed8 100%)',
      orb: 'radial-gradient(circle at 78% 22%, rgba(255,255,255,0.26), transparent 22%)',
      accent: '#93c5fd',
      text: '#eff6ff',
    },
    component: Nasa,
  },
  {
    id: 'rijksmuseum',
    title: 'Rijksmuseum',
    subtitle: 'Dutch masters and public-domain art',
    logo: assetUrl('logos/rijksmuseum.svg'),
    lightLogoOnDark: true,
    mark: 'rijksmuseum',
    palette: {
      background: 'linear-gradient(135deg, #3f1d12 0%, #7c2d12 44%, #d97706 100%)',
      orb: 'radial-gradient(circle at 18% 18%, rgba(255,251,235,0.24), transparent 28%)',
      accent: '#fde68a',
      text: '#fff7ed',
    },
    component: Rijks,
  },
  {
    id: 'metmuseum',
    title: 'The Met',
    subtitle: 'The Metropolitan Museum collection',
    logo: assetUrl('logos/met.svg'),
    mark: 'THE MET',
    palette: {
      background: 'linear-gradient(135deg, #450a0a 0%, #991b1b 52%, #ef4444 100%)',
      orb: 'radial-gradient(circle at 80% 24%, rgba(254,242,242,0.22), transparent 30%)',
      accent: '#fecaca',
      text: '#fff1f2',
    },
    component: MetMuseum,
  },
  {
    id: 'artic',
    title: 'Art Institute of Chicago',
    subtitle: 'Open-access public-domain artworks',
    logo: assetUrl('logos/artic.svg'),
    mark: 'AIC',
    palette: {
      background: 'linear-gradient(135deg, #450a0a 0%, #b50938 44%, #b50938 100%)',
      orb: 'radial-gradient(circle at 78% 20%, rgba(255,255,255,0.2), transparent 26%)',
      accent: '#b50938',
      text: '#eff6ff',
    },
    component: ArtInstituteChicago,
  },
  {
    id: 'reddit',
    title: 'Reddit',
    subtitle: 'Single-image posts from your favorite subreddit',
    logo: assetUrl('logos/reddit.svg'),
    mark: 'r/',
    palette: {
      background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #fdba74 100%)',
      orb: 'radial-gradient(circle at 20% 20%, rgba(255,247,237,0.25), transparent 28%)',
      accent: '#FF4500',
      text: '#fff7ed',
    },
    component: Reddit,
  },
  {
    id: 'reddit-gallery',
    title: 'Reddit Gallery',
    subtitle: 'Multi-image gallery posts, split into individual images',
    logo: assetUrl('logos/reddit.svg'),
    mark: '▣',
    palette: {
      background: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 32%, #f97316 68%, #fed7aa 100%)',
      orb: 'radial-gradient(circle at 74% 26%, rgba(255,255,255,0.18), transparent 25%)',
      accent: '#FF4500',
      text: '#fff7ed',
    },
    component: RedditGallery,
  },
  {
    id: 'pexels',
    title: 'Pexels',
    subtitle: 'Free photography with fast search',
    logo: assetUrl('logos/pexels.svg'),
    mark: 'P',
    palette: {
      background: 'linear-gradient(135deg, #052e2b 0%, #115e59 48%, #14b8a6 100%)',
      orb: 'radial-gradient(circle at 76% 24%, rgba(240,253,250,0.22), transparent 28%)',
      accent: '#99f6e4',
      text: '#ecfeff',
    },
    component: Pexels,
  },
  {
    id: 'pixabay',
    title: 'Pixabay',
    subtitle: 'Photos, illustrations, and more',
    logo: assetUrl('logos/pixabay.svg'),
    lightLogoOnDark: true,
    mark: 'Px',
    palette: {
      background: 'linear-gradient(135deg, #1f2937 0%, #374151 52%, #9ca3af 100%)',
      orb: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2), transparent 24%)',
      accent: '#e5e7eb',
      text: '#f9fafb',
    },
    component: Pixabay,
  },
  {
    id: 'openverse',
    title: 'Openverse',
    subtitle: 'Creative Commons search across multiple archives',
    logo: assetUrl('logos/openverse.svg'),
    lightLogoOnDark: true,
    mark: 'Openverse',
    palette: {
      background: 'linear-gradient(135deg, #312e81 0%, #7c3aed 50%, #c084fc 100%)',
      orb: 'radial-gradient(circle at 82% 20%, rgba(250,245,255,0.24), transparent 26%)',
      accent: '#e9d5ff',
      text: '#faf5ff',
    },
    component: Openverse,
  },
]

const SOURCE_MAP = Object.fromEntries(SOURCE_DEFS.map((source) => [source.id, source])) as Record<SourceId, SourceDef>
const RESULTS_PAGE_STEP = 24
const SOURCE_RESULTS_MAX = 72
const OPENVERSE_RESULTS_MAX = 96

export default function Sources() {
  useEffect(() => { document.title = 'SAWSUBE — Discover Art' }, [])

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <h1 className="text-2xl">Discover Art</h1>
        <p className="text-sm text-muted max-w-3xl">
          Explore different sources to discover and import art into your library.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {SOURCE_DEFS.map((source) => (
            <Link
              key={source.id}
              to={`/sources/${source.id}`}
              className="group card overflow-hidden transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="relative aspect-[11/12] overflow-hidden flex flex-col" style={{ background: source.palette.background }}>
                <SourceArtwork source={source} compact />
                <div
                  className="relative z-10 flex min-h-28 flex-col justify-start p-4 text-[#F4F1ED] bg-gradient-to-b from-black/70 via-black/40 to-black/20"
                  // style={{ background: `linear-gradient(180deg, rgba(15,25,35,0.04) 0%, rgba(15,25,35,0.78) 28%, ${source.palette.accent} 100%)` }}
                >
                  <div className="text-xl font-semibold">{source.title}</div>
                  <div className="text-sm opacity-90">{source.subtitle}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SourceDetail() {
  const params = useParams<{ sourceId: string }>()
  const source = useMemo(() => {
    const id = params.sourceId as SourceId | undefined
    return id ? SOURCE_MAP[id] : undefined
  }, [params.sourceId])

  useEffect(() => {
    document.title = source ? `SAWSUBE — ${source.title}` : 'SAWSUBE — Discover Art'
  }, [source])

  if (!source) return <Navigate to="/sources" replace />

  const SourceComponent = source.component

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link to="/sources" className="inline-flex items-center text-sm text-muted hover:text-fg">
          ← Back to Discover Art
        </Link>
        <div className="card overflow-hidden">
          <div className="relative min-h-44 max-h-72">
            <SourceArtwork source={source} showBrand={false} />
            <div className="absolute inset-0 z-10 flex items-center justify-start gap-6 px-8 py-4">
              <div className="flex h-28 w-[32%] shrink-0 items-center">
                {source.logo ? (
                  <img
                    src={source.logo}
                    alt=""
                    className={`max-h-28 max-w-full object-contain ${source.lightLogoOnDark ? 'brightness-0 invert' : ''}`}
                  />
                ) : (
                  <div
                    className="text-7xl font-semibold text-center"
                    style={{
                      color: source.palette.accent,
                      fontFamily: source.id === 'rijksmuseum' || source.id === 'openverse' ? 'var(--font-body)' : 'var(--font-display)',
                      letterSpacing: source.id === 'rijksmuseum' ? '0.08em' : '0.18em',
                      textTransform: source.id === 'rijksmuseum' ? 'lowercase' : 'uppercase',
                    }}
                  >
                    {source.mark}
                  </div>
                )}
              </div>
              <div className="flex h-28 max-w-2xl items-end text-[#F4F1ED]">
                <div>
                  <h1 className="text-3xl">{source.title}</h1>
                  <p className="mt-2 text-sm opacity-90">{source.subtitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SourceComponent />
    </div>
  )
}

function SourceArtwork({ source, compact = false, showBrand = true }: { source: SourceDef; compact?: boolean; showBrand?: boolean }) {
  if (compact) {
    return (
      <div className="relative flex-[2_2_0%] overflow-hidden bg-white" aria-hidden="true">
        <div className="absolute inset-0 opacity-90" />
        <div className="absolute inset-0 flex items-center justify-center px-6 py-6">
          {source.logo ? (
            <img
              src={source.logo}
              alt=""
              className="max-h-16 max-w-[78%] object-contain"
            />
          ) : (
            <div
              className="text-4xl font-semibold text-center"
              style={{
                color: source.palette.accent,
                fontFamily: source.id === 'rijksmuseum' || source.id === 'openverse' ? 'var(--font-body)' : 'var(--font-display)',
                letterSpacing: source.id === 'rijksmuseum' ? '0.08em' : '0.18em',
                textTransform: source.id === 'rijksmuseum' ? 'lowercase' : 'uppercase',
              }}
            >
              {source.mark}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: source.palette.background }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(15,25,35,0.84) 0%, rgba(15,25,35,0.28) 100%)' }}
      />
      {showBrand ? (
        <div className="absolute inset-0 z-10 flex items-center justify-start px-8 py-16">
          {source.logo ? (
            <img
              src={source.logo}
              alt=""
              className={`max-h-28 max-w-[62%] object-contain ${source.lightLogoOnDark ? 'brightness-0 invert' : ''}`}
            />
          ) : (
            <div
              className="text-7xl font-semibold text-center"
              style={{
                color: source.palette.accent,
                fontFamily: source.id === 'rijksmuseum' || source.id === 'openverse' ? 'var(--font-body)' : 'var(--font-display)',
                letterSpacing: source.id === 'rijksmuseum' ? '0.08em' : '0.18em',
                textTransform: source.id === 'rijksmuseum' ? 'lowercase' : 'uppercase',
              }}
            >
              {source.mark}
            </div>
          )}
        </div>
      ) : null}
      <div
        className="absolute right-8 bottom-4 h-36 w-36 rounded-full blur-3xl"
        style={{ background: source.palette.accent, opacity: 0.22 }}
      />
    </div>
  )
}

function Grid({ items, onImport }: { items: any[]; onImport: (it: any) => void }) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const preview = previewIndex === null ? null : items[previewIndex] ?? null

  useEffect(() => {
    if (previewIndex === null) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewIndex(null)
      if (e.key === 'ArrowRight') setPreviewIndex((i) => (i === null ? i : (i + 1) % items.length))
      if (e.key === 'ArrowLeft') setPreviewIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [items.length, previewIndex])

  useEffect(() => {
    setPreviewLoading(previewIndex !== null)
  }, [previewIndex])

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it, index) => (
          <div key={it.id || it.url} className="card overflow-hidden group">
            <button
              type="button"
              className="block w-full"
              onClick={() => setPreviewIndex(index)}
            >
              <div className="overflow-hidden">
                <img
                  src={resolveImageSrc(it.thumb || it.url)}
                  className="w-full aspect-[4/3] object-cover transition duration-300 ease-out group-hover:scale-[1.03] group-hover:-translate-y-1"
                />
              </div>
            </button>
            <div className="p-2 text-xs">
              <div className="truncate font-semibold">{it.title || '—'}</div>
              <div className="text-muted truncate">{it.credit || ''}</div>
              <button className="btn-primary mt-2 w-full" onClick={() => onImport(it)}>Import</button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-[fadeIn_180ms_ease-out]"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="card w-full max-w-5xl overflow-hidden animate-[modalIn_220ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{preview.title || 'Preview'}</div>
                <div className="truncate text-sm text-muted">{preview.credit || ''}</div>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 1 && (
                  <>
                    <button className="btn-ghost" aria-label="Previous result" title="Previous result" onClick={() => setPreviewIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length))}>
                      <ChevronLeft size={16} strokeWidth={2} />
                    </button>
                    <button className="btn-ghost" aria-label="Next result" title="Next result" onClick={() => setPreviewIndex((i) => (i === null ? i : (i + 1) % items.length))}>
                      <ChevronRight size={16} strokeWidth={2} />
                    </button>
                  </>
                )}
                <button className="btn-ghost" aria-label="Close preview" title="Close preview" onClick={() => setPreviewIndex(null)}>
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="relative min-h-[60vh] bg-black/80">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-[#F4F1ED]">
                    <Spinner className="text-accent text-3xl" />
                    <span className="text-sm text-[#F4F1ED]">Loading preview…</span>
                  </div>
                </div>
              )}
              <img
                src={resolveImageSrc(preview.url || preview.thumb)}
                className={`max-h-[80vh] w-full object-contain transition-opacity duration-200 ${previewLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setPreviewLoading(false)}
                onError={() => setPreviewLoading(false)}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="text-xs text-muted">
                {items.length > 1 ? 'Use left/right arrow keys to move between results.' : '\u00A0'}
              </div>
              <button
                className="btn-primary"
                onClick={() => onImport(preview)}
              >
                <IconLabel icon={Plus}>Add to Library</IconLabel>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function resolveImageSrc(src: string) {
  return src.startsWith('/') ? makeUrl(src) : src
}

function SearchResults({
  loading,
  items,
  onImport,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: {
  loading: boolean
  items: any[]
  onImport: (it: any) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hasMore || !onLoadMore || loading || loadingMore || !sentinelRef.current) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onLoadMore()
    }, { rootMargin: '300px 0px' })

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, onLoadMore])

  if (loading) {
    return (
      <div className="card p-10 flex items-center justify-center min-h-56">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Spinner className="text-accent text-2xl" />
          <span className="text-sm">Searching…</span>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <Grid items={items} onImport={onImport} />
      {(hasMore || loadingMore) && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {loadingMore && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="text-accent text-xl" />
              <span>Loading more…</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Unsplash() {
  const [q, setQ] = useState('landscape')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [perPage, setPerPage] = useState(RESULTS_PAGE_STEP)
  const t = useToast()
  const search = async (nextPerPage = RESULTS_PAGE_STEP, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try {
      setItems(await api.get(`/api/sources/unsplash/search?q=${encodeURIComponent(q)}&per_page=${nextPerPage}`))
      setPerPage(nextPerPage)
    }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn-primary" onClick={() => search()}>Search</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= perPage && perPage < SOURCE_RESULTS_MAX} onLoadMore={() => search(Math.min(perPage + RESULTS_PAGE_STEP, SOURCE_RESULTS_MAX), true)} onImport={async (it) => {
        try { await api.post('/api/sources/unsplash/import', { id: it.id }); t.push({ type: 'success', text: 'Imported' }) }
        catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}

function Nasa() {
  const [info, setInfo] = useState<any>(null)
  const t = useToast()
  useEffect(() => { api.get('/api/sources/nasa/apod').then(setInfo).catch(() => {}) }, [])
  if (!info) return <div className="text-muted">Loading…</div>
  if (info.unsupported) return <div className="card p-4 text-muted">Today's APOD is not an image ({info.media_type}).</div>
  return (
    <div className="card p-4 space-y-3">
      <div className="font-semibold">{info.title}</div>
      <img src={info.url} className="max-h-96 mx-auto" />
      <p className="text-sm text-muted">{info.explanation}</p>
      <button className="btn-primary" onClick={async () => {
        try { await api.post('/api/sources/nasa/apod/import'); t.push({ type: 'success', text: 'Imported' }) }
        catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }}>Import to library</button>
    </div>
  )
}

function Rijks() {
  const [q, setQ] = useState('vermeer')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [perPage, setPerPage] = useState(RESULTS_PAGE_STEP)
  const t = useToast()
  const search = async (nextPerPage = RESULTS_PAGE_STEP, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try { setItems(await api.get(`/api/sources/rijksmuseum/search?q=${encodeURIComponent(q)}&per_page=${nextPerPage}`)); setPerPage(nextPerPage) }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn-primary" onClick={() => search()}>Search</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= perPage && perPage < SOURCE_RESULTS_MAX} onLoadMore={() => search(Math.min(perPage + RESULTS_PAGE_STEP, SOURCE_RESULTS_MAX), true)} onImport={async (it) => {
        try { await api.post('/api/sources/rijksmuseum/import', { id: it.id }); t.push({ type: 'success', text: 'Imported' }) }
        catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}

function MetMuseum() {
  const [q, setQ] = useState('monet')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [perPage, setPerPage] = useState(RESULTS_PAGE_STEP)
  const t = useToast()
  const search = async (nextPerPage = RESULTS_PAGE_STEP, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try { setItems(await api.get(`/api/sources/metmuseum/search?q=${encodeURIComponent(q)}&per_page=${nextPerPage}`)); setPerPage(nextPerPage) }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Searches The Metropolitan Museum of Art’s public domain collection. No API key required.</p>
      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn-primary" onClick={() => search()}>Search</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= perPage && perPage < SOURCE_RESULTS_MAX} onLoadMore={() => search(Math.min(perPage + RESULTS_PAGE_STEP, SOURCE_RESULTS_MAX), true)} onImport={async (it) => {
        try { await api.post('/api/sources/metmuseum/import', { id: it.id }); t.push({ type: 'success', text: 'Imported' }) }
        catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}

function ArtInstituteChicago() {
  const [q, setQ] = useState('seurat')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [perPage, setPerPage] = useState(RESULTS_PAGE_STEP)
  const t = useToast()
  const search = async (nextPerPage = RESULTS_PAGE_STEP, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try { setItems(await api.get(`/api/sources/artic/search?q=${encodeURIComponent(q)}&per_page=${nextPerPage}`)); setPerPage(nextPerPage) }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Searches public-domain works from the Art Institute of Chicago and imports them via their IIIF image service. No API key required.</p>
      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn-primary" onClick={() => search()}>Search</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= perPage && perPage < SOURCE_RESULTS_MAX} onLoadMore={() => search(Math.min(perPage + RESULTS_PAGE_STEP, SOURCE_RESULTS_MAX), true)} onImport={async (it) => {
        try { await api.post('/api/sources/artic/import', { id: it.id }); t.push({ type: 'success', text: 'Imported' }) }
        catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}

function Pixabay() {
  const [q, setQ] = useState('landscape')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [perPage, setPerPage] = useState(RESULTS_PAGE_STEP)
  const t = useToast()
  const search = async (nextPerPage = RESULTS_PAGE_STEP, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try { setItems(await api.get(`/api/sources/pixabay/search?q=${encodeURIComponent(q)}&per_page=${nextPerPage}`)); setPerPage(nextPerPage) }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Search Pixabay photos…" />
        <button className="btn-primary" onClick={() => search()}>Search</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= perPage && perPage < SOURCE_RESULTS_MAX} onLoadMore={() => search(Math.min(perPage + RESULTS_PAGE_STEP, SOURCE_RESULTS_MAX), true)} onImport={async (it) => {
        try { await api.post('/api/sources/pixabay/import', { id: it.id }); t.push({ type: 'success', text: 'Imported' }) }
        catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}

function Pexels() {
  const [q, setQ] = useState('landscape')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [perPage, setPerPage] = useState(RESULTS_PAGE_STEP)
  const t = useToast()
  const search = async (nextPerPage = RESULTS_PAGE_STEP, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try { setItems(await api.get(`/api/sources/pexels/search?q=${encodeURIComponent(q)}&per_page=${nextPerPage}`)); setPerPage(nextPerPage) }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Search Pexels photos…" />
        <button className="btn-primary" onClick={() => search()}>Search</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= perPage && perPage < SOURCE_RESULTS_MAX} onLoadMore={() => search(Math.min(perPage + RESULTS_PAGE_STEP, SOURCE_RESULTS_MAX), true)} onImport={async (it) => {
        try { await api.post('/api/sources/pexels/import', { id: it.id }); t.push({ type: 'success', text: 'Imported' }) }
        catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}

function Reddit() {
  const [sub, setSub] = useState('EarthPorn')
  const [sort, setSort] = useState('top')
  const [tt, setTt] = useState('week')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [limit, setLimit] = useState(RESULTS_PAGE_STEP)
  const t = useToast()
  const fetchIt = async (nextLimit = RESULTS_PAGE_STEP, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try { setItems(await api.get(`/api/sources/reddit/fetch?sub=${sub}&sort=${sort}&t=${tt}&limit=${nextLimit}`)); setLimit(nextLimit) }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="subreddit" />
        <select className="input w-28" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option>top</option><option>hot</option><option>new</option>
        </select>
        <select className="input w-28" value={tt} onChange={(e) => setTt(e.target.value)}>
          <option>day</option><option>week</option><option>month</option><option>year</option><option>all</option>
        </select>
        <button className="btn-primary" onClick={() => fetchIt()}>Fetch</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= limit && limit < SOURCE_RESULTS_MAX} onLoadMore={() => fetchIt(Math.min(limit + RESULTS_PAGE_STEP, SOURCE_RESULTS_MAX), true)} onImport={async (it) => {
        try {
          await api.post('/api/sources/reddit/import', {
            url: it.url, id: it.id,
            meta: { title: it.title, credit: it.credit, html: it.html, subreddit: it.subreddit },
          })
          t.push({ type: 'success', text: 'Imported' })
        } catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}

function Openverse() {
  const [q, setQ] = useState('landscape')
  const [category, setCategory] = useState('')
  const [licenseType, setLicenseType] = useState('')
  const [aspectRatio, setAspectRatio] = useState('wide')
  const [size, setSize] = useState('large')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pageSize, setPageSize] = useState(RESULTS_PAGE_STEP)
  const t = useToast()
  const search = async (nextPageSize = RESULTS_PAGE_STEP, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const params = new URLSearchParams({ q, page_size: String(nextPageSize) })
      if (category) params.set('category', category)
      if (licenseType) params.set('license_type', licenseType)
      if (aspectRatio) params.set('aspect_ratio', aspectRatio)
      if (size) params.set('size', size)
      setItems(await api.get(`/api/sources/openverse/search?${params}`))
      setPageSize(nextPageSize)
    } catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Searches millions of Creative Commons licensed images from Flickr, Wikimedia, museums, and more. Requires free API credentials — <a className="underline" href="https://api.openverse.org/v1/#tag/auth" target="_blank" rel="noopener noreferrer">register here</a>, then add <code>OPENVERSE_CLIENT_ID</code> and <code>OPENVERSE_CLIENT_SECRET</code> to your .env.</p>
      <div className="flex gap-2 flex-wrap">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Search Openverse…" />
        <select className="input w-40" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All types</option>
          <option value="photograph">Photograph</option>
          <option value="illustration">Illustration</option>
          <option value="digitized_artwork">Digitized artwork</option>
        </select>
        <select className="input w-36" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
          <option value="">Any ratio</option>
          <option value="wide">Wide</option>
          <option value="tall">Tall</option>
          <option value="square">Square</option>
        </select>
        <select className="input w-32" value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">Any size</option>
          <option value="large">Large</option>
          <option value="medium">Medium</option>
          <option value="small">Small</option>
        </select>
        <select className="input w-44" value={licenseType} onChange={(e) => setLicenseType(e.target.value)}>
          <option value="">Any license</option>
          <option value="public_domain">Public domain</option>
          <option value="commercial">Commercial use OK</option>
          <option value="modification">Modifications OK</option>
        </select>
        <button className="btn-primary" onClick={() => search()}>Search</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= pageSize && pageSize < OPENVERSE_RESULTS_MAX} onLoadMore={() => search(Math.min(pageSize + RESULTS_PAGE_STEP, OPENVERSE_RESULTS_MAX), true)} onImport={async (it) => {
        try {
          await api.post('/api/sources/openverse/import', { id: it.id })
          t.push({ type: 'success', text: 'Imported' })
        } catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}

function RedditGallery() {
  const [sub, setSub] = useState('EarthPorn')
  const [sort, setSort] = useState('top')
  const [tt, setTt] = useState('week')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [limit, setLimit] = useState(25)
  const t = useToast()
  const fetchIt = async (nextLimit = 25, append = false) => {
    if (!append) setItems([])
    append ? setLoadingMore(true) : setLoading(true)
    try { setItems(await api.get(`/api/sources/reddit-gallery/fetch?sub=${sub}&sort=${sort}&t=${tt}&limit=${nextLimit}`)); setLimit(nextLimit) }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { append ? setLoadingMore(false) : setLoading(false) }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Fetches individual images from gallery posts (multi-image posts). Each image in a gallery is shown separately.</p>
      <div className="flex gap-2">
        <input className="input" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="subreddit" />
        <select className="input w-28" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option>top</option><option>hot</option><option>new</option>
        </select>
        <select className="input w-28" value={tt} onChange={(e) => setTt(e.target.value)}>
          <option>day</option><option>week</option><option>month</option><option>year</option><option>all</option>
        </select>
        <button className="btn-primary" onClick={() => fetchIt()}>Fetch</button>
      </div>
      <SearchResults loading={loading} items={items} loadingMore={loadingMore} hasMore={items.length >= limit && limit < SOURCE_RESULTS_MAX} onLoadMore={() => fetchIt(Math.min(limit + RESULTS_PAGE_STEP, SOURCE_RESULTS_MAX), true)} onImport={async (it) => {
        try {
          await api.post('/api/sources/reddit-gallery/import', {
            url: it.url, id: it.id,
            meta: { title: it.title, credit: it.credit, html: it.html, subreddit: it.subreddit, ext: it.ext },
          })
          t.push({ type: 'success', text: 'Imported' })
        } catch (e: any) { t.push({ type: 'error', text: e.message }) }
      }} />
    </div>
  )
}
