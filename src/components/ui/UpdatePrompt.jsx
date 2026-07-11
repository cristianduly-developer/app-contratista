import { useState, useEffect } from 'react'

export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const onUpdate = () => setShowUpdate(true)
    window.addEventListener('sw:update', onUpdate)

    import('workbox-window').then(({ Workbox }) => {
      const wb = new Workbox('/sw.js')
      wb.addEventListener('waiting', () => window.dispatchEvent(new Event('sw:update')))
      wb.register()
    }).catch(() => {})

    return () => window.removeEventListener('sw:update', onUpdate)
  }, [])

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] rounded-2xl p-4 flex items-center gap-3"
      style={{ background: '#1C1C27', border: '1px solid #F97316', maxWidth: 430, margin: '0 auto' }}>
      <p className="text-white text-[13px] flex-1">Nueva versión disponible</p>
      <button onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-xl text-[12px] font-bold text-white"
        style={{ background: '#F97316' }}>
        Actualizar
      </button>
    </div>
  )
}
