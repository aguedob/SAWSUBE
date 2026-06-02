import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import { Spinner } from '../components/Loading'
import { decodeHtmlEntities } from '../lib/text'

export default function Discover() {
  useEffect(() => { document.title = 'SAWSUBE — Discover' }, [])
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [manual, setManual] = useState({ name: 'Frame TV', ip: '', mac: '' })
  const t = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const didAutoScan = useRef(false)

  const scan = async () => {
    setScanning(true)
    try {
      const r = await api.get<any[]>('/api/tvs/discover')
      setResults(r)
      if (!r.length) t.push({ type: 'info', text: 'No TVs found' })
    } catch (e: any) { t.push({ type: 'error', text: e.message }) }
    finally { setScanning(false) }
  }

  useEffect(() => {
    if (!location.state || !(location.state as { autoScan?: boolean }).autoScan || didAutoScan.current) return
    didAutoScan.current = true
    navigate(location.pathname, { replace: true, state: null })
    scan()
  }, [location.pathname, location.state, navigate])

  const add = async (payload: any) => {
    try {
      const tv: any = await api.post('/api/tvs', payload)
      t.push({ type: 'success', text: `Added ${tv.name}. Now press Pair on TV Control.` })
    } catch (e: any) { t.push({ type: 'error', text: e.message }) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Discover</h1>
      <div className="card p-4 space-y-3">
        <button className="btn-primary" onClick={scan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Scan Network'}
        </button>
        {scanning && (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <Spinner className="text-accent text-3xl" />
            <div>
              <div className="font-semibold">Scanning your network…</div>
              <div className="text-sm text-muted">Looking for Samsung TVs on your local network.</div>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.ip} className="flex justify-between items-center border border-border rounded p-2">
              <div className="text-sm">
                <div className="font-semibold">{decodeHtmlEntities(r.name || r.model || 'Samsung')} {r.frame ? '(Frame)' : ''}</div>
                <div className="text-xs text-muted">{r.ip} · {r.model || 'unknown'} · MAC {r.wifi_mac || '—'}</div>
              </div>
              <button className="btn-primary"
                      onClick={() => add({ name: decodeHtmlEntities(r.name || r.model || 'Frame'), ip: r.ip, mac: r.wifi_mac, port: 8002 })}>
                Add
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold">Manual entry</div>
        <div className="grid grid-cols-3 gap-2">
          <input className="input" placeholder="Name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          <input className="input" placeholder="IP" value={manual.ip} onChange={(e) => setManual({ ...manual, ip: e.target.value })} />
          <input className="input" placeholder="MAC (for WoL)" value={manual.mac} onChange={(e) => setManual({ ...manual, mac: e.target.value })} />
        </div>
        <button className="btn-primary" disabled={!manual.ip} onClick={() => add({ ...manual, port: 8002 })}>Add manually</button>
      </div>
    </div>
  )
}
