import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  faBolt,
  faCalendarDays,
  faCompass,
  faDisplay,
  faFilm,
  faGear,
  faImage,
  faSliders,
  faTelevision,
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { api, TV, TVStatus } from '../lib/api'
import { useWS } from '../lib/hooks'

const links = [
  ['/', 'Dashboard', faDisplay],
  ['/library', 'Library', faImage],
  ['/tv', 'TV Control', faTelevision],
  ['/discover', 'Discover', faCompass],
  ['/sources', 'Sources', faFilm],
  ['/schedules', 'Schedules', faCalendarDays],
  ['/settings', 'Settings', faSliders],
  ['/tizenbrew', 'TizenBrew', faWandMagicSparkles],
  ['/debloat', 'Debloat', faBolt],
] as const

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tvs, setTvs] = useState<TV[]>([])
  const [statuses, setStatuses] = useState<Record<number, TVStatus>>({})
  const location = useLocation()

  // Close drawer on navigation (mobile)
  useEffect(() => { onClose() }, [location.pathname])

  const refresh = async () => {
    try {
      const list = await api.get<TV[]>('/api/tvs')
      setTvs(list)
      const results = await Promise.all(
        list.map((t) => api.get<TVStatus>(`/api/tvs/${t.id}/status`).catch(() => null)),
      )
      const ss: Record<number, TVStatus> = {}
      list.forEach((t, i) => { if (results[i]) ss[t.id] = results[i] as TVStatus })
      setStatuses(ss)
    } catch {
      /* ignore */
    }
  }
  useEffect(() => { refresh() }, [])
  useWS((m) => {
    if (m.type === 'tv_status') setStatuses((s) => ({ ...s, [m.tv_id]: { ...s[m.tv_id], ...m.payload, id: m.tv_id } }))
  })

  return (
    <aside
      style={{ background: 'rgb(var(--sidebar-bg))', width: '240px' }}
      className={[
        'shrink-0 h-full flex flex-col overflow-y-auto',
        // Mobile: fixed overlay drawer, slides in/out
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full',
        // Desktop: back in normal flow
        'md:static md:translate-x-0 md:z-auto',
      ].join(' ')}
    >
      {/* Close button — mobile only */}
      <button
        className="md:hidden absolute top-3 right-3"
        onClick={onClose}
        aria-label="Close menu"
        style={{ color: 'rgb(var(--sidebar-muted))', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px' }}
      ><FontAwesomeIcon icon={faXmark} /></button>
      {/* Logo block — Canvas background matches logo's own background for perfect rendering */}
      <div style={{ background: 'rgb(var(--bg))', borderBottom: '3px solid rgb(var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 20px' }}>
        <img src="Logo.png" alt="SAWSUBE" style={{ height: '38px', width: 'auto', display: 'block' }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-1">
        {links.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => isActive ? 'sawsube-nav-active' : 'sawsube-nav-item'}>
            <span className="inline-flex items-center gap-3">
              <FontAwesomeIcon icon={icon} className="w-4" />
              <span>{label}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      {/* TV status list */}
      <div style={{ borderTop: '1px solid rgb(var(--sidebar-border))' }} className="p-3 space-y-2">
        <div style={{ color: 'rgb(var(--sidebar-muted))' }} className="text-xs">TVs</div>
        {tvs.length === 0 && <div style={{ color: 'rgb(var(--sidebar-muted))' }} className="text-xs">None added</div>}
        {tvs.map((t) => {
          const st = statuses[t.id]
          const dotColor = st?.online ? '#4A7C5F' : st ? '#A33228' : '#C49A3C'
          return (
            <div key={t.id} className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--sidebar-muted))' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
              <span className="truncate">{t.name}</span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgb(var(--sidebar-border))', color: 'rgb(var(--sidebar-muted))', fontSize: '11px', fontFamily: 'var(--font-body)', padding: '10px 20px' }}>
        <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faGear} />SAWSUBE · by WB</span>
      </div>
    </aside>
  )
}
