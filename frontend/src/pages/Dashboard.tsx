import { useEffect, useState } from 'react'
import { faArrowsRotate, faForward, faImage, faPalette, faPowerOff } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { api, TV, TVStatus } from '../lib/api'
import { IconLabel } from '../components/IconLabel'
import { LoadingInline, LoadingMessage } from '../components/Loading'
import { useWS } from '../lib/hooks'

export default function Dashboard() {
  const [tvs, setTvs] = useState<TV[]>([])
  const [statuses, setStatuses] = useState<Record<number, TVStatus>>({})
  const [stats, setStats] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await api.get<TV[]>('/api/tvs')
      setTvs(list)
      const results = await Promise.all(
        list.map((t) => api.get<TVStatus>(`/api/tvs/${t.id}/status`).catch(() => null)),
      )
      const ss: Record<number, TVStatus> = {}
      list.forEach((t, i) => { if (results[i]) ss[t.id] = results[i] as TVStatus })
      setStatuses(ss)
      setStats(await api.get('/api/stats'))
      setHistory(await api.get<any[]>('/api/history?limit=20'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { document.title = 'SAWSUBE — Dashboard'; refresh() }, [])
  useWS((m) => {
    if (m.type === 'tv_status') setStatuses((s) => ({ ...s, [m.tv_id]: { ...s[m.tv_id], ...m.payload, id: m.tv_id } }))
    if (m.type === 'art_changed') refresh()
  })

  const next = async (tv_id: number) => {
    // pick a random tv_image and select
    const items = await api.get<any[]>(`/api/images/tv/${tv_id}`)
    if (!items.length) return
    const pick = items[Math.floor(Math.random() * items.length)]
    await api.post(`/api/tvs/${tv_id}/art/current`, { tv_image_id: pick.id })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Dashboard</h1>
      {loading && (
        <LoadingMessage text="Loading dashboard…" />
      )}
      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="TVs" value={stats.tvs} />
          <Stat label="Images" value={stats.images} />
          <Stat label="On TVs" value={stats.images_on_tv} />
          <Stat label="Active schedules" value={stats.schedules_active} />
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!loading && tvs.length === 0 && (
          <div className="card p-6 text-muted">No TVs registered yet. Go to Discover to add one.</div>
        )}
        {tvs.map((t) => {
          const st = statuses[t.id]
          return (
            <div key={t.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted">{t.ip} · {t.model || '—'}</div>
                </div>
                <span className={`badge ${st?.online ? 'border-[#4A7C5F] text-[#4A7C5F]' : 'border-[#A33228] text-[#A33228]'}`}>
                  {st?.online ? 'Online' : 'Offline'}{st?.artmode ? ' · Art' : ''}
                </span>
              </div>
              {st?.current && (
                <div className="text-xs text-muted">Now showing: <span className="text-fg">{st.current}</span></div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button className="btn-primary" onClick={() => next(t.id)}><IconLabel icon={faForward}>Next image</IconLabel></button>
                <button className="btn-ghost" onClick={() => api.post(`/api/tvs/${t.id}/artmode/on`)}><IconLabel icon={faPalette}>Art Mode On</IconLabel></button>
                <button className="btn-ghost" onClick={() => api.post(`/api/tvs/${t.id}/artmode/off`)}><IconLabel icon={faPowerOff}>Art Mode Off</IconLabel></button>
                <button className="btn-ghost" onClick={refresh}><IconLabel icon={faArrowsRotate}>Refresh</IconLabel></button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="card p-4">
        <div className="font-semibold mb-2">Recent history</div>
        <div className="text-sm space-y-1 max-h-64 overflow-auto">
          {loading && <LoadingInline text="Loading recent history…" />}
          {history.map((h) => (
            <div key={h.id} className="flex justify-between text-muted">
              <span>TV {h.tv_id} · image {h.image_id}</span>
              <span>{new Date(h.shown_at).toLocaleString()} · {h.trigger}</span>
            </div>
          ))}
          {!loading && history.length === 0 && <div className="text-muted">No history yet</div>}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted inline-flex items-center gap-2">{label === 'Images' && <FontAwesomeIcon icon={faImage} />}{label}</div>
      <div className="text-2xl font-bold">{value ?? '—'}</div>
    </div>
  )
}
