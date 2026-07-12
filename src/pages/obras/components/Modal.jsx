export default function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[70vh] overflow-y-auto"
        style={{ background: '#13131A' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-[16px]">{title}</h3>
          <button onClick={onClose} className="text-gray-500 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
