import { useEffect, useRef } from 'react'

export default function Modal({ onClose, title, children }) {
  const modalRef = useRef(null)

  useEffect(() => {
    const el = modalRef.current
    if (!el) return

    const focusable = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    function handleKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }

    first?.focus()
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}
      role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" />
      <div ref={modalRef} className="relative w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[70vh] overflow-y-auto"
        style={{ background: '#13131A' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-[16px]">{title}</h3>
          <button onClick={onClose} className="text-gray-500 text-xl" aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
