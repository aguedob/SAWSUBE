import { useEffect, useState } from 'react'
import { faFloppyDisk, faFolderPlus, faFolderTree, faTrash, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { api, Folder, TV } from '../lib/api'
import { useToast } from '../components/Toast'
import { IconLabel } from '../components/IconLabel'
import { LoadingInline } from '../components/Loading'
import { ThemeMode, useTheme } from '../lib/hooks'

export default function Settings() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [newPath, setNewPath] = useState('')
  const [tvs, setTvs] = useState<TV[]>([])
  const [tvNames, setTvNames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const t = useToast()
  const { theme, setTheme } = useTheme()

  const load = async () => {
    setLoading(true)
    try {
      setFolders(await api.get<Folder[]>('/api/sources/folders'))
      const tvList = await api.get<TV[]>('/api/tvs')
      setTvs(tvList)
      setTvNames(Object.fromEntries(tvList.map((tv) => [tv.id, tv.name])))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { document.title = 'SAWSUBE — Settings'; load() }, [])

  const addFolder = async () => {
    if (!newPath) return
    try { await api.post('/api/sources/folders', { path: newPath, is_active: true, auto_display: false }); setNewPath(''); load() }
    catch (e: any) { t.push({ type: 'error', text: e.message }) }
  }

  const renameTv = async (tv: TV) => {
    const nextName = (tvNames[tv.id] ?? '').trim()
    if (!nextName || nextName === tv.name) return
    try {
      await api.patch(`/api/tvs/${tv.id}`, { name: nextName })
    } catch (e: any) {
      t.push({ type: 'error', text: e.message })
      return
    }
    t.push({ type: 'success', text: `Renamed TV to ${nextName}` })
    load()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl">Settings</h1>

      <Section title="Watch folders">
        <div className="flex gap-2">
          <input className="input" placeholder="/path/to/folder" value={newPath} onChange={(e) => setNewPath(e.target.value)} />
          <button className="btn-primary" onClick={addFolder}><IconLabel icon={faFolderPlus}>Add</IconLabel></button>
        </div>
        <div className="space-y-1 mt-3">
          {loading && <LoadingInline text="Loading watch folders…" />}
          {folders.map((f) => (
            <div key={f.id} className="flex justify-between items-center text-sm border border-border rounded px-3 py-2">
              <span className="truncate">{f.path}</span>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => api.post(`/api/sources/folders/${f.id}/scan`).then((r: any) => t.push({ type: 'success', text: `Scanned: ${r.added} new` }))}><IconLabel icon={faFolderTree}>Scan now</IconLabel></button>
                <button className="btn-danger" onClick={() => api.del(`/api/sources/folders/${f.id}`).then(load)}><IconLabel icon={faTrash}>Remove</IconLabel></button>
              </div>
            </div>
          ))}
          {!loading && folders.length === 0 && <div className="text-muted text-sm">None.</div>}
        </div>
      </Section>

      <Section title="TVs">
        {loading && <LoadingInline text="Loading registered TVs…" />}
        {tvs.map((t) => (
          <div key={t.id} className="flex flex-col gap-2 py-2 border-b last:border-b-0 border-border">
            <div className="text-sm text-muted">{t.ip} · {t.mac || 'no MAC'}</div>
            <div className="flex gap-2 items-center">
              <input
                className="input"
                value={tvNames[t.id] ?? ''}
                onChange={(e) => setTvNames((prev) => ({ ...prev, [t.id]: e.target.value }))}
              />
              <button className="btn-primary" disabled={!(tvNames[t.id] ?? '').trim() || (tvNames[t.id] ?? '').trim() === t.name} onClick={() => renameTv(t)}><IconLabel icon={faFloppyDisk}>Save</IconLabel></button>
              <button className="btn-danger" onClick={() => confirm('Remove TV?') && api.del(`/api/tvs/${t.id}`).then(load)}><IconLabel icon={faTrash}>Remove</IconLabel></button>
            </div>
          </div>
        ))}
        {!loading && tvs.length === 0 && <div className="text-muted text-sm">No TVs registered.</div>}
      </Section>

      <Section title="Theme">
        <div className="space-y-2">
          <div className="text-sm text-muted">Choose how SAWSUBE should follow your preferred appearance.</div>
          <select
            className="input max-w-xs"
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeMode)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (browser/system)</option>
          </select>
        </div>
      </Section>

      <Section title="Environment notes">
        <p className="text-sm text-muted">
          API keys (Unsplash, Rijksmuseum, NASA) and other defaults are configured via the
          <code className="mx-1 px-1 bg-card rounded">.env</code> file in the backend directory.
          Edit and restart the backend to apply.
        </p>
        <ul className="text-xs text-muted list-disc pl-5 space-y-0.5">
          <li>UNSPLASH_API_KEY</li>
          <li>RIJKSMUSEUM_API_KEY</li>
          <li>TV_RESOLUTION (4K | 1080p)</li>
          <li>PORTRAIT_HANDLING (blur | crop | skip)</li>
          <li>IMAGE_FOLDER (downloaded source images)</li>
        </ul>
      </Section>

      <Section title="Danger zone">
        <button className="btn-danger" onClick={async () => {
          if (!confirm('Wipe all art from every TV? Local DB is kept.')) return
          for (const tv of tvs) {
            const items: any[] = await api.get(`/api/images/tv/${tv.id}`)
            for (const it of items) await api.del(`/api/images/${it.image_id}/tv/${tv.id}`)
          }
          t.push({ type: 'success', text: 'Done' })
        }}><IconLabel icon={faWandMagicSparkles}>Wipe all art from TVs</IconLabel></button>
      </Section>
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div className="card p-4 space-y-2">
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  )
}
