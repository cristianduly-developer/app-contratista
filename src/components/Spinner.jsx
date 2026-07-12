export default function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#0A0A0F' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#F97316' }}
        role="status" aria-label="Cargando" />
    </div>
  )
}
